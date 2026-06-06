async function resetOrder(client) {
  await client.query(`
    truncate table order_items, orders, bills, service_requests, sessions, outbox_events
    restart identity cascade
  `);
}

module.exports = { resetOrder };
