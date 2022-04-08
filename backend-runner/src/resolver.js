const { MongoClient } = require("mongodb");
var ObjectId = require("mongoose").Types.ObjectId;
const argon2 = require("argon2");
const { ApolloError } = require("apollo-server");
const jwt = require("jsonwebtoken");

class Resolvers {
  async connect() {
    const mongoClient = new MongoClient(`${process.env.MONGO_DB_URL}`);
    await mongoClient.connect();
    this.db = mongoClient.db(
      `${process.env.PROJECT_ID}+${process.env.NODE_ENV}`
    );
  }

  namesToIds(collectionName, obj) {
    return Object.keys(obj).reduce((acc, key) => {
      if (key === "_id") {
        acc._id = obj._id;
      } else {
        acc[global.tableAndFieldNameMap[collectionName].fields[key].id] =
          obj[key];
      }
      return acc;
    }, {});
  }

  idsToNamesRemoveHashes(collectionId, objArray) {
    return objArray.map((doc) =>
      Object.keys(doc).reduce((acc, key) => {
        if (key === "_id") {
          acc._id = doc._id;
        } else {
          if (
            global.tableAndFieldIdMap[collectionId].fields[key].config.isHashed
          ) {
            acc[global.tableAndFieldIdMap[collectionId].fields[key].name] =
              null;
          } else {
            acc[global.tableAndFieldIdMap[collectionId].fields[key].name] =
              doc[key];
          }
        }
        return acc;
      }, {})
    );
  }

  getModelName(collectionId) {
    return global.tableAndFieldIdMap[collectionId].name;
  }

  async hashRequiredFields(collectionId, obj) {
    const returnValue = { ...obj };
    for (const key in obj) {
      if (key === "_id") {
        returnValue._id = obj._id;
      } else {
        if (
          global.tableAndFieldIdMap[collectionId].fields[key].config.isHashed
        ) {
          returnValue[key] = await argon2.hash(returnValue[key]);
        }
      }
    }
    return returnValue;
  }

  async genericFieldResolver(
    parent,
    args,
    context,
    info,
    fieldName,
    entityId,
    collectionName
  ) {
    console.log(`parent`);
    console.log(parent);
    console.log(`fieldName`);
    console.log(fieldName);
    console.log(`entityId`);
    console.log(entityId);
    const docs = await this.db
      .collection(entityId)
      .find({ _id: new ObjectId(parent[fieldName]) })
      .toArray();
    return this.idsToNamesRemoveHashes(entityId, docs)[0];
  }

  async genericFieldListResolver(
    parent,
    args,
    context,
    info,
    fieldName,
    entityId,
    collectionName
  ) {
    // todo: accept args to further filter the returned list
    const docs = await this.db
      .collection(entityId)
      .find({
        _id: { $in: (parent[fieldName] || []).map((id) => new ObjectId(id)) },
      })
      .toArray();
    return {
      nextToken: null,
      items: this.idsToNamesRemoveHashes(entityId, docs),
    };
  }

  async genericGetQueryResolver(
    collectionId,
    collectionName,
    parent,
    args,
    context,
    info
  ) {
    const docs = await this.db
      .collection(collectionName)
      .find({ _id: new ObjectId(args._id) })
      .toArray();
    docs.l;
    return this.idsToNamesRemoveHashes(collectionId, docs)[0];
  }

  async genericListQueryResolver(
    collectionId,
    collectionName,
    parent,
    args,
    context,
    info
  ) {
    const docs = await this.db
      .collection(collectionId)
      .find(
        global.filterParser(
          args.filter,
          global.tableAndFieldNameMap[collectionName].fields
        ) || {}
      )
      .limit(args.limit || 0)
      .toArray();
    return {
      nextToken: null,
      items: this.idsToNamesRemoveHashes(collectionId, docs),
    };
  }

  async genericCreateResolver(
    collectionId,
    collectionName,
    parent,
    args,
    context,
    info
  ) {
    const remappedEntry = this.namesToIds(collectionName, args);
    const hashedEntry = await this.hashRequiredFields(
      collectionId,
      remappedEntry
    );
    const status = await this.db
      .collection(collectionId)
      .insertOne(hashedEntry);
    const doc = await this.db
      .collection(collectionId)
      .find({ _id: status.insertedId })
      .toArray();
    const ret = this.idsToNamesRemoveHashes(collectionId, doc)[0];
    return ret;
  }

  async genericDeleteResolver(collectionName, parent, args, context, info) {
    const doc = await this.db
      .collection(collectionName)
      .findOneAndDelete({ _id: new ObjectId(args.input._id) });
    return doc.value;
  }

  async genericUpdateResolver(
    collectionId,
    collectionName,
    parent,
    args,
    context,
    info
  ) {
    const updateValues = args.input;
    const remappedEntry = this.namesToIds(collectionName, updateValues);
    const hashedEntry = await this.hashRequiredFields(
      collectionId,
      remappedEntry
    );
    const filter =
      global.filterParser(
        args.filter,
        global.tableAndFieldNameMap[collectionName].fields
      ) || {};
    const id = remappedEntry._id;
    delete hashedEntry._id;
    filter._id = new ObjectId(id);
    const status = await this.db
      .collection(collectionId)
      .findOneAndUpdate(filter, { $set: hashedEntry });
    const doc = await this.db
      .collection(collectionId)
      .find({ _id: filter._id })
      .toArray();
    const ret = this.idsToNamesRemoveHashes(collectionId, doc)[0];
    return ret;
  }

  async loginResolver(
    tableId,
    usernameFieldId,
    passwordFieldId,
    usernameCaseSensitive,
    args,
    parent,
    context,
    info
  ) {
    context.res.clearCookie("token");
    if (usernameCaseSensitive) {
      throw new ApolloError("Not Implemented");
    }
    const doc = await this.db
      .collection(tableId)
      .find({ [usernameFieldId]: args.username })
      .toArray();
    if (doc.length > 0) {
      const record = doc[0];
      const username = record[usernameFieldId];
      const password = record[passwordFieldId];
      if (await argon2.verify(password, args.password)) {
        const token = jwt.sign(
          { username, id: record._id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
        context.res.cookie("token", token, {
          httpOnly: true,
          secure: false,
          maxAge: 1000 * 60 * 60 * 24 * 7,
        });
        return jwt.sign(
          { websocket: true, username, id: record._id.toString() },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
      }
    }
    return null;
  }
  async logoutResolver(
    collectionName,
    usernameFieldId,
    passwordFieldId,
    args,
    parent,
    context,
    info
  ) {
    return "true";
  }
  async registerResolver(
    collectionId,
    collectionName,
    usernameId,
    passwordId,
    args,
    parent,
    context,
    info
  ) {
    const remappedEntry = this.namesToIds(collectionName, args.userData);
    const hashedEntry = await this.hashRequiredFields(
      collectionId,
      remappedEntry
    );
    try {
      const doc = await this.db.collection(collectionId).insertOne(hashedEntry);
      const token = jwt.sign(
        { username: hashedEntry[usernameId], id: doc.insertedId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      context.res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return jwt.sign(
        {
          websocket: true,
          username: hashedEntry[usernameId],
          id: doc.insertedId.toString(),
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
    } catch (e) {
      console.error(e);
    }
    throw new ApolloError(`failed to register user`);
  }

  async me(collectionId, collectionName, args, parent, context, info) {
    if (context.req.cookies) {
      console.log(collectionId);
      const user = jwt.decode(context.req.cookies.token);
      console.log(user.id);
      if (user.id) {
        const docs = await this.db
          .collection(collectionId)
          .find({ _id: new ObjectId(user.id) })
          .toArray();
        console.log(docs);
        return this.idsToNamesRemoveHashes(collectionId, docs)[0];
      }
    }
  }
}

exports.resolver = new Resolvers();
