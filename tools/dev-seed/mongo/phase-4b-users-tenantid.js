db.getCollection('user').updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: null, isActive: true } });

db.getCollection('user').createIndex({ tenantId: 1 });
db.getCollection('user').createIndex({ tenantId: 1, isActive: 1 });
