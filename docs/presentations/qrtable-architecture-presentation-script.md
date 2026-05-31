# Script presenting QRTable system architecture

> This document is a script to read when presenting the architecture for the topic: **Research and build a SaaS POS platform integrating ordering via QR code based on Microservices architecture**.
>
> Main audience: instructor or council does not go too deeply into implementing microservices, but needs to clearly understand how the system is layered, which services do what, where data and requests go, why choose technologies like BFF, TCP, gRPC, Kafka, Redis, Keycloak, SePay, Cloudinary.

---

## 1. How to use this script

Script is written in a form that can be read directly. When presenting, there is no need to read every word if time is short; You can use the **Main Points** paragraphs to summarize, while the **Reading Script** section is used when you need to explain more clearly.

A reasonable presentation:

1. Start with the context and system goals.
2. Explain the overall architecture by each layer.
3. Go through each group of services and how they communicate.
4. Present the core business flows: login, QR scan, order, kitchen processing, payment.
5. Conclusion with underlying mechanisms: multi-tenancy, RBAC, Redis, Kafka, reliability.

---

## 2. Opening the presentation

### Main idea to say

- QRTable is a SaaS platform for restaurants, cafes, or F&B models.
- The system allows many restaurants to share the same platform, but data is still separated by each tenant.
- Customers scan QR at the table to view the menu, order, call service and pay.
- Employees use Management App to manage POS, kitchen, menu, tables, orders and payments.
- The main architecture is microservices, combining synchronous and asynchronous communication.

### Script read

In this section, I will present the overall architecture of the QRTable system. This is a SaaS POS platform for the F&B industry, meaning multiple restaurants can use the same software system, but the data and operations of each restaurant remain isolated.

The core point of the system is to digitize the table service process. Customers do not need to download a separate app, just scan the QR code on the table to open Customer PWA, view the menu, add items to the cart, send orders to the kitchen, track status and request payment. On the restaurant side, staff and managers use the Management App to confirm orders, monitor the kitchen, update order status, process payments, manage tables, menus and staffing.

Technically, the system is not built as a single monolithic backend. I chose microservices architecture to separate large operations into independent services such as Catalog, Order, Kitchen, Payment, SaaS, User Access and Authorizer. Each service has clear responsibilities, owns its data, and communicates with other services through standard mechanisms such as TCP, gRPC, Kafka and WebSocket.

The goal of this architecture is not to make the system more complex, but to make the system easy to scale, easy to maintain, easy to isolate errors and suitable for multi-tenant SaaS problems.

---

## 3. Background concepts need to be explained first

### Main idea to say

- tenant: a restaurant or a shop on the platform.
- Session: a round of guests sitting at a table after scanning the QR.
- BFF: Backend for Frontend, is the only gateway for the frontend.
- service: a small backend responsible for a business domain.
- Provider: external systems such as Keycloak, SePay, Cloudinary.
- Sync vs Async: call directly to get results immediately, or emit events to process later.

### Script read

Before going into the diagram, I would like to quickly explain some concepts that will appear throughout the presentation.

The first is **tenant**. In this system, a tenant can simply be understood as a restaurant or shop using the QRTable platform. Because this is a SaaS system, many tenants run on the same infrastructure, but restaurant A's data cannot be mixed with restaurant B's.

The second is **session**. Session is a session of serving guests at a table. When a customer scans the QR at table 5 of a restaurant, the system creates or restores a session for that table. From this session, the system knows which table the customer is ordering from, which tenant they belong to, and which order is tied to that session.

The third is **BFF**, which stands for Backend for Frontend. BFF is the backend layer that stands in front of all microservices. Frontend does not call Order service or Payment service directly, but always goes through BFF. This method makes the frontend simpler, and the system has a centralized point to handle authentication, authorization, tenant context, routing and realtime.

Fourth is **service**. Each service is responsible for a separate business domain. For example, Catalog service manages menus and tables, Order service manages ordering sessions and bills, Kitchen service manages kitchen screens, Payment service processes payments.

Fifth is **provider**, which is the external system. QRTable integrates Keycloak for login and identity management, SePay to receive VietQR payments via webhook, and Cloudinary to store food images.

Finally, there are two types of communication: **synchronous** and **asynchronous**. Synchronous communication is when a service calls another service and needs immediate results, for example BFF asks Order service to get bill details. Asynchronous communication is when one service broadcasts an event to Kafka, another service processes it later, for example, the Order service broadcasts the event `order.confirmed` and the Kitchen service automatically receives that event to create a kitchen ticket.

---

## 4. Overall architecture by layer

### Main idea to say

The system is divided into main layers:

| Layers                       | Ingredients                                                     | Role                                      |
| ---------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| User and Provider Layer      | Customer, Staff, Manager, Platform Admin, SePay                 | External users and systems impact QRTable |
| Client Application Layer     | Customer PWA, Management App                                    | Interactive interface                     |
| API Gateway Layer            | BFF API, BFF Realtime Gateway                                   | REST and WebSocket Gateway                |
| Microservice Layer           | Authorizer, User Access, SaaS, Catalog, Order, Kitchen, Payment | Business processing                       |
| Runtime Infrastructure Layer | PostgreSQL, MongoDB, Redis, Kafka                               | Storage, cache, event streaming           |
| External Provider Layer      | Keycloak, Cloudinary, SePay VietQR                              | Third Party Services                      |

### Script read

If we look at the whole, I divide the system into six main layers.

The first layer is **User and Provider Layer**. This is where the action comes from. Customer is the customer who scans the QR and orders the food. Staff are employees such as waiters, chefs, baristas. Manager or Owner is the person who manages the restaurant. Platform Admin is the administrator of the SaaS platform. There is also SePay Banking Network, which is an external system that sends webhooks when there is a transfer transaction.

The second layer is **Client Application Layer**. Here there are two main frontend applications. Customer PWA for customers, runs directly in the browser after scanning the QR. Management App for staff and managers, used to operate the restaurant: POS, KDS, menu, table, payment and user management.

The third layer is **API Gateway Layer**. This is BFF class. BFFs have two big roles. One is to receive REST requests from the frontend via HTTP at port 3300. The other is to maintain a realtime gateway using Socket.IO in namespace `/orders`, to push changes such as new orders, kitchen tickets, SLA alerts, successful payments to the interface almost instantly.

The fourth layer is **Microservice Layer**. This is the main business processing part. The system currently has services: Authorizer, User Access, SaaS, Catalog, Order, Kitchen and Payment. Each service has its own role, its own port, and communicates primarily with BFF or other services using TCP or gRPC.

The fifth layer is **Runtime Infrastructure Layer**. This is the infrastructure that runs behind: PostgreSQL stores main business data, MongoDB stores user/role/permission, Redis is used for session, cart, cache, KDS queue and realtime pubsub, and Kafka is used to transmit asynchronous events between services.

The final layer is **External Provider Layer**. Keycloak manages logins and tokens, Cloudinary stores food photos, and SePay/VietQR supports bank transfer payment flows.

The important point is: the frontend does not talk directly to the database nor does it call each service directly. It all goes through BFF. The back-end services are separated by business domain, communicating with each other using protocols appropriate to each situation.

---

## 5. Main communication board in the system

### Main idea to say

| From           | To           | Protocol                    | Purpose                               |
| -------------- | ------------ | --------------------------- | ------------------------------------- |
| Customer PWA   | BFF          | HTTP REST 3300              | Menu, cart, order, bill, payment      |
| Management App | BFF          | HTTP REST 3300              | POS, KDS, administration              |
| Frontend       | BFF Realtime | Socket.IO `/orders`         | Get realtime updates                  |
| BFF            | Authorizer   | gRPC 5100, TCP 3204         | Token authentication, auth policy     |
| BFF            | User Access  | TCP 3203                    | User, role, permission                |
| BFF            | SaaS         | TCP 3206                    | tenant, slug, tenant configuration    |
| BFF            | Catalog      | TCP 3205                    | Menu, category, table, QR             |
| BFF            | Order        | TCP 3201                    | Session, cart, order, bill            |
| BFF            | Kitchen      | TCP 3207                    | KDS queue, ticket action              |
| BFF            | Payment      | TCP 3208                    | QR payment, webhook, cash, refund     |
| Order          | Kafka        | Topic `order.confirmed`     | Report confirmed order to the kitchen |
| Kitchen        | Kafka        | Topic `kitchen.sla_warning` | Report ticket time out                |
| Payment        | Kafka        | Topic `payment.completed`   | Notification of completed payment     |
| SePay          | BFF          | HTTP webhooks               | Report transfer transactions          |

### Script read

For easy visualization, I summarize the most important communication lines of the system.

From the frontend to the backend, both the Customer PWA and the Management App call the BFF over HTTP REST on port 3300, with the global prefix `api/v1`. For example, Customer PWA calls API to get menu, update cart, send order, view bill or create payment QR. Management App calls API to manage menus, tables, order confirmation, KDS operations and payment processing.

In parallel with HTTP, both frontends also connect Socket.IO to the BFF Realtime Gateway in namespace `/orders`. This is the channel used to receive realtime updates. For example, when a customer submits an order, the employee's POS screen can receive a notification. When the kitchen updates the item as ready, customers or employees can also see the new status.

From BFF to services, the system uses NestJS TCP transport mainly. BFF calls Order service via TCP port 3201, Catalog via 3205, Kitchen via 3207, Payment via 3208, SaaS via 3206, User Access via 3203. As for the token authentication flow, it needs a clear contract and is often called a lot, so BFF uses gRPC to Authorizer on port 5100.

Between services, the system doesn't call everything directly. For operations that need immediate response, for example Payment needs to get a snapshot bill from Order, the service can call TCP. But for side-effects that occur later, the system uses Kafka. For example, after Order service confirms the order, it issues event `order.confirmed`, Kitchen service consumes that event itself to create a kitchen ticket. After Payment service completes payment, it emits `payment.completed`, Order service can consume to mark the bill as paid, BFF can also consume to push realtime.

This division helps the system to both respond quickly to users and reduce direct dependencies between services when processing background operations.

---

## 6. Reasons to choose BFF as the only gateway

### Main idea to say

- Frontend only needs to know one backend endpoint.
- BFF combines authentication, authorization, tenant context and routing.
- BFF hides the complexity of microservices behind the scenes.
- BFF is the right place to handle realtime rooms for customers, staff, sales staff and managers.

### Script read

In this architecture, BFF plays a very important role. Without BFF, the Customer PWA and Management App would have to know each service behind the scenes. For example, the frontend must call the Catalog service to get the menu, the Order service to send the order, the Payment service to make the payment, and the Authorizer to authenticate. This makes the frontend sinly dependent on the backend and makes it difficult to change the backend architecture.

So I chose BFF as the only entry point. The frontend only knows one main API address: BFF at port 3300. When a request comes in, BFF will determine which tenant the request belongs to, who the user is, what session, what permissions it has, then route to the appropriate service.

BFF is also a good place for realtime processing. Because BFF is the layer closest to the client, it can maintain WebSocket with the frontend and manage rooms such as customer session rooms, staff rooms in the same tenant, kitchen rooms, bar rooms, or manager rooms. When downstream services broadcast events or publish Redis pubsub, BFF receives that information and pushes it to the correct user group.

In short, BFF makes the frontend simpler, makes the backend microservices hidden, and gives the system a unified coordination point for API and realtime.

---

## 7. Frontend layer: Customer PWA and Management App

### Main idea to say

- Customer PWA for guests, does not require account login.
- Management App for employees, managers and admins, with login via Keycloak.
- The two frontends have different experiences but share the same BFF.

### Script read

On the frontend side, the system has two main applications.

The first application is **Customer PWA**. This is the interface for customers at the table. Guests do not need to create an account. Guest entry point is QR code. When scanning the QR, the application opens in the browser, the system knows which tenant, desk, and session the customer is in. From there, customers can view the menu, add items to the cart, submit orders, call service and request payment.

The second application is **Management App**. This is the interface for the restaurant and platform side. Waiters are used to view orders, confirm orders, process payments or transfer tables. Kitchens and baristas use KDS to view tickets by station. Management is used to manage menus, tables, personnel and monitor operations. Platform admin is used for platform-level operations such as tenant management.

The big difference is that Customer PWA operates according to the QR session, while Management App operates according to the login account. Management App logs in via Keycloak and receives JWT. Then each request sent to BFF will include a Bearer token for the system to determine roles and permissions.

---

## 8. Identity, RBAC and authorization

### Main idea to say

- Keycloak manages identities: login, JWT, realm, client.
- User Access manages internal data: user, role, permission.
- Authorizer stands in the middle to verify the token and get permission context.
- RBAC includes roles: SUPER_ADMIN, Owner, MANAGER, WAITER, CHEF, BARISTA.
- CUSTOMER does not have a role in the database; Guests are controlled using QR sessions.

### Script read

Regarding authentication and authorization, the system is divided into two parts: identification and business rights.

The identifier is assigned to Keycloak. Keycloak is responsible for logging in, issuing JWTs, managing realm `qrtable` and client `qrtable-bff`. When employees or managers log in in the Management App, they are redirected to Keycloak. After successful login, the frontend receives a token and uses that token when calling the API.

However, the token only indicates who the user is and what role he or she has at the identity level. The system still needs to know what specific rights that role in the QRTable has. This section is managed by the User Access service. User Access stores users, roles and permissions in MongoDB. For example, Owner has many operating rights within the tenant; MANAGER is similar to Owner but does not have some sensitive permissions such as deleting users; WAITER has the right to confirm orders, process service requests, and make cash payments; CHEF and BARISTA focus on KDS.

Authorizer service is the connection layer between BFF, Keycloak and User Access. When the BFF needs to authenticate the token, the BFF calls the Authorizer via gRPC on port 5100. The Authorizer can check the token with Keycloak, then get user, role, permission information from User Access. Thanks to that, BFF knows whether this request is valid, which tenant it belongs to, and whether it has the right to call the endpoint.

For customers, the system does not force customers to create an account. CUSTOMER is a special actor, there is no role in `role.json`. Guests are controlled by QR token, tenant id, table id and session id. In other words, the guest does not have administrative rights; Customers can only operate within the session of the table they are using.

When presented to the teacher, RBAC can be understood as a door control layer. After logging in, users may not be able to do everything. The system also checks which tenant that person belongs to and what permissions they have, for example, whether they can update the menu, confirm payment, or operate kitchen tickets.

---

## 9. Multi-tenancy and data isolation

### Main idea to say

- tenant is a restaurant/store on the platform.
- Every request needs tenant context.
- The system uses the database per service model combined with `tenant_id`.
- Services do not read other services' databases directly.
- SUPER_ADMIN has cross-tenant scope; The remaining roles are limited to the tenant.

### Script read

Because QRTable is a SaaS platform, the multi-tenancy problem is a very important part. A tenant is a restaurant that uses the system. Each tenant has its own menu, its own table, its own orders, its own staff, and its own operating configuration.

The system applies a combined model between **database per service** and **tenant discriminator**. Database per service means that each service owns data belonging to its business domain. Catalog service owns menu and table data. Order service owns session, order, and bill data. Payment service owns payment, refund, audit data. User Access owns users, roles, and permissions in MongoDB.

Inside each service, business data is bound to `tenant_id`. When a request comes in, the system determines the tenant context from the login token or from the customer's QR/session. The service then only processes data in that tenant.

The important point is that the service does not arbitrarily read another service's database. For example, Order service does not read the menu table of Catalog service directly. If you need to check a table or menu item, the Order service calls the Catalog service via TCP. This helps keep boundaries clear: Catalog is the only place that understands and manages catalog data; Order only uses catalog information through the interface.

Regarding decentralization, SUPER_ADMIN is a special role with cross-tenant scope to manage the platform. Owner, MANAGER, WAITER, CHEF and BARISTA are all limited to the tenant of the restaurant they belong to. This helps avoid situations where one restaurant employee sees another restaurant's data.

---

## 10. Microservice layer: role of each service

### Main idea to say

| service     | Main port                      | Role                                               |
| ----------- | ------------------------------ | -------------------------------------------------- |
| Authorizer  | HTTP 3304, TCP 3204, gRPC 5100 | Token authentication, policy, Keycloak integration |
| User Access | HTTP 3303, TCP 3203, gRPC 5200 | User, role, permission                             |
| SaaS        | HTTP 3306, TCP 3206            | tenant, slug, subscription metadata                |
| Catalog     | HTTP 3305, TCP 3205            | Menu, category, area, table, QR metadata           |
| Order       | HTTP 3301, TCP 3201            | Session, cart, order, bill, service request        |
| Kitchen     | HTTP 3307, TCP 3207            | KDS queue, ticket, station, SLA                    |
| Payment     | HTTP 3308, TCP 3208            | VietQR, webhook, cash payment, refund              |

### Script read

At the microservices layer, each service is designed according to a separate business domain.

**Authorizer service** is in charge of authentication and access policy. This service works with Keycloak to check JWT and works with User Access to know what roles and permissions the user has. This is a service that uses gRPC at port 5100 for the token verification flow because this flow needs a clear contract and is called frequently.

**User Access service** manages users, roles and permissions. This service's data is stored in MongoDB. This is the primary data source for the system's RBAC. When needing to know whether a user has permission `order.confirm` or `payment.refund`, the system retrieves role/permission information from here.

**SaaS service** tenant management. This service stores restaurant information, slugs, activity status and metadata related to subscriptions. In the SaaS model, this service helps the system know which restaurant is active, which tenant is suspended, or which tenant has its own operating configuration.

**Catalog service** manages menus, categories, areas, tables and QR metadata. This is the service in charge of the data that customers see when opening the menu, and the data that restaurants manage when updating dishes, dish photos, stock status, and table maps.

**Order service** is the heart of the ordering process. This service manages sessions, carts, orders, order items, bills and service requests. When a customer submits an order, Order service saves the order. When the employee confirms the order, Order service sends an event for Kitchen service to process.

**Kitchen service** is in charge of KDS. When receiving event `order.confirmed`, this service creates tickets according to station, for example, food goes to the kitchen, drinks go to the bar. Kitchen saves queues in Redis for quick processing and pushing realtime information to the KDS screen.

**Payment service** is in charge of payment. This service creates VietQR information, processes SePay webhooks, records cash payments, refunds, and broadcasts completed payment events.

One point to emphasize is that HTTP ports 3301 to 3308 help each service still run and debug independently, but architecturally the client does not call these services directly. Client goes through BFF, BFF routes down to service by TCP or gRPC.

---

## 11. Runtime infrastructure: PostgreSQL, MongoDB, Redis, Kafka

### Main idea to say

- PostgreSQL: stores relational business data and requires transactions.
- MongoDB: save users, roles, permissions more flexibly.
- Redis: session, cart, cache, KDS queue, pubsub, Socket.IO adapter.
- Kafka: event streaming between services.

### Script read

At the runtime infrastructure layer, the system uses four main components.

**PostgreSQL** is the main database for relational and transactional operations. For example, Catalog stores menus, categories, tables; Order stores sessions, orders, bills; Payment saves payment, refund, audit; SaaS saves tenants. These data have clear relationships and need high consistency, so PostgreSQL is suitable.

**MongoDB** is used for User Access, specifically users, roles and permissions. This section is relevant to the document model because roles can contain a list of permissions that can change over time.

**Redis** is used for hot and realtime data. For example, client session, session cart, cache token, rate limit, KDS queue, Redis pubsub and Socket.IO adapter. Redis is suitable because of its very fast speed, which helps operations such as updating the shopping cart or updating KDS not always impact the database heavily.

**Kafka** is used for asynchronous event transmission. When a service completes an important business event, it publishes the event to Kafka. Another service can consume that event to handle its work without making the service generating the event wait. For example, Order issues `order.confirmed`, Kitchen receives it to create a ticket. Payment broadcast `payment.completed`, Order received to update bill and BFF received to push realtime.

In the development environment, these infrastructures are built using Docker Compose: PostgreSQL at port 5432, MongoDB at 27017, Redis at 6379, Kafka with internal listener 9092 and host listener 29092, Keycloak running at 8180.

---

## 12. External providers: Keycloak, Cloudinary, SePay

### Main idea to say

- Keycloak handles login and JWT.
- Cloudinary saves menu images.
- SePay/VietQR processes transfer payments via QR and webhook.

### Script read

The system also integrates a number of external providers.

The first provider is **Keycloak**. This is an IAM system used to manage login, user identity, JWT, realm and client. QRTable does not write the entire login mechanism from scratch but uses Keycloak to ensure OAuth2/OIDC standards and ease of expansion.

The second provider is **Cloudinary**. When a restaurant manager uploads a photo of a dish, BFF will handle the upload to Cloudinary. Catalog service stores the image URL, and the frontend uses this URL to display the menu image. This method helps the backend not have to manually save image files on the server, while also taking advantage of Cloudinary's CDN and image delivery.

The third provider is **SePay/VietQR**. Payment service creates QR image URL according to bank account information, amount and bill reference code. The frontend displays this QR to guests or employees. When a customer transfers money, SePay detects the transaction and sends a webhook to BFF. BFF checks the webhook auth according to the route being used, then transfers the payload to Payment service to confirm the corresponding bill.

These three providers help the system focus on the main business, while standard parts such as identity, image storage and bank webhooks are assigned to specialized services.

---

## 13. Login flow and employee authorization

### Main idea to say

Main stream:

1. Employee opens Management App.
2. App redirects to Keycloak to log in.
3. Keycloak returns the JWT to the Management App.
4. Management App calls BFF with Bearer token.
5. BFF calls Authorizer gRPC to verify token.
6. Authorizer checks Keycloak and gets role/permission from User Access.
7. BFF allows or denies requests according to tenant and permission.

### Script read

The employee login flow starts from the Management App. When an employee opens the app and needs to go to the admin screen, the frontend redirects the user to Keycloak to log in.

After successful login, Keycloak returns the JWT to the Management App. From that point on, each request sent to BFF will include the Bearer token in the Authorization header.

When BFF receives a request, BFF does not trust the token blindly. BFF calls the Authorizer service via gRPC on port 5100 to verify the token and get the auth context. The Authorizer checks the token with Keycloak, then can call the User Access service to get the user profile, role and corresponding permission list.

After having the auth context, the BFF decides whether the request can continue or not. For example, if the user is WAITER, the order can be confirmed or cash payment processed, but the user cannot be deleted. If the user is CHEF, they have the right to view and update kitchen tickets, but not manage menus or payments. If it is Owner or MANAGER, it has broader operating rights within the tenant. If it is SUPER_ADMIN then there is platform scope.

The important point here is that the system checks both ways: who the user is and which tenant he or she belongs to. Thanks to that, an employee of restaurant A cannot access restaurant B's data.

---

## 14. Client flow scans QR and creates session

### Main idea to say

Main stream:

1. Guest scans the QR on the table.
2. Customer PWA opens the URL containing tenant/table/token information.
3. BFF checks QR/session context.
4. The system creates or restores a session for the table.
5. Redis saves/cache sessions for fast processing.
6. Catalog provides table and menu information.

### Script read

Guest flow starts when the guest scans the QR on the table. A QR code is more than just a simple link; It carries information so the system knows which table this is, which restaurant it belongs to, and whether the token is valid or not.

After the Customer PWA opens, the frontend calls the BFF to initialize or restore the session. BFF will handle tenant context and session context. In terms of business, the system needs to ensure that this QR belongs to the correct tenant, the correct desk, and whether the current session is allowed to operate or not.

If the table does not have an active session, the system creates a new session. This session represents the current number of guests at that table. If the table already has a session, the system can restore the session for the customer to continue working.

Redis plays an important role in this step. Session and cart are frequently accessed data, so saving/caching in Redis helps the system respond quickly. PostgreSQL still stores business data persistently, but Redis helps reduce the load and support more real-time operations.

After the session is ready, the frontend calls the API to get the menu. BFF route request to Catalog service via TCP 3205. Catalog service reads menu, category, table data from PostgreSQL and returns it to BFF, BFF returns Customer PWA.

Simply put, QR scan is the step that turns an anonymous client into a session with a clear scope: which tenant, which desk, and which data can be operated on.

---

## 15. Menu viewing and catalog management flow

### Main idea to say

- Catalog service owns menu, category, area, table.
- Customer reads the menu through BFF.
- Manager updates menu via Management App.
- Food photos are uploaded to Cloudinary, URL is saved to Catalog.

### Script read

Catalog service is a service that manages all menu and table data. When the customer views the menu, the Customer PWA calls the BFF, which calls the Catalog service via TCP. Catalog reads data from PostgreSQL and returns a list of categories, menu items, prices, availability, and image URLs.

When restaurant managers update menus, the flow also goes through Management App and BFF. For example, managers add new items, edit prices, update out of stock status, create categories or update tables. BFF route request to Catalog service. Catalog service is the only place that writes catalog data to PostgreSQL.

Particularly, food photos are processed via Cloudinary. When uploading photos, BFF sends the file to Cloudinary. Cloudinary returns the image URL. This URL is saved to the menu item data in the Catalog. Thanks to that, the system does not have to manually manage image files in the database or server filesystem.

An important point is that the Order service does not read the Catalog database itself. When you need to check an item or table, the Order service calls the Catalog via TCP. This ensures that the Catalog remains the source of truth for menus and tables.

---

## 16. Order flow from customers to staff

### Main idea to say

Main stream:

1. Customer adds items to cart.
2. Cart/session is managed by tenant and session.
3. Customer submits order.
4. BFF calls Order service via TCP 3201.
5. Order service validate session, table, menu snapshot.
6. Order service saves orders/bills to PostgreSQL.
7. BFF pushes realtime to let staff know there are new orders.

### Script read

After viewing the menu, customers can add items to the cart. This cart is tied to the tenant and session. Technically, cart data is a fast-changing data type, so Redis is a suitable place to save snapshots or cart state during client operations.

When the customer clicks submit, the Customer PWA calls BFF. BFF calls Order service via TCP port 3201. Order service is the main responsible for the ordering process.

Order service needs to check whether the session is valid, whether the table is still in a state that allows orders, whether the cart has data, and whether the items in the cart belong to the current menu. When snapshot table or menu information is needed, Order service calls Catalog service over TCP 3205. This is an example of synchronous communication between services, because Order needs immediate results to decide whether to create an order or not.

After successful validation, Order service saves the order, order item and bill into PostgreSQL. If this is the first order in the session, the system can create a corresponding bill for the entire session.

After the order is created, BFF can push it in real time to the Management App so that employees can see there are new orders. This is realtime serving the interface, it doesn't necessarily go through Kafka if it's just instant UI notifications. Kafka will be more important in the single step that is confirmed by the employee and needs to trigger processing in the kitchen.

---

## 17. The staff confirms the order and takes it to the kitchen

### Main idea to say

Main stream:

1. Staff views new orders on Management App.
2. Staff confirms or rejects the application.
3. BFF calls Order service.
4. Order service updates order status.
5. Order service publish event `order.confirmed` to Kafka.
6. Kitchen service consume event to create KDS ticket.

### Script read

After a customer submits an application, the application is usually in a status awaiting confirmation. The waiter sees the new order on the POS in the Management App. If the application is valid, the staff confirms. If there is a problem, for example the item is out of stock or the customer has made an incorrect request, the staff can refuse or cancel the pending order at their discretion.

When the employee confirms the order, Management App calls BFF, BFF calls Order service via TCP. Order service updates order status in PostgreSQL.

At the time the order has been confirmed, the subsequent operations are no longer part of the Order service. The kitchen needs to know this order to prepare the dish. If Order service calls Kitchen service directly and waits for Kitchen to finish processing, the two services will be time-dependent. If the Kitchen is slow or temporarily fails, the Order is also affected.

So, Order service publishes event `order.confirmed` to Kafka. This event says: the order has been confirmed, this is the tenant, order id and list of items to be processed. Kitchen service is the consumer of this topic. When receiving an event, Kitchen automatically creates a KDS ticket.

This is a prime example of event-driven microservices. Order only generates business events, while Kitchen handles kitchen operations itself. Orders do not need to know how the Kitchen saves the queue, how the stations are divided, or how it is displayed on the KDS screen.

---

## 18. Kitchen/KDS stream and realtime for kitchen

### Main idea to say

- Kitchen consume `order.confirmed`.
- Create tickets by station such as kitchen/bar.
- Save queue in Redis.
- Publish Redis pubsub so BFF realtime pushes it to KDS.
- SLA warning publish Kafka topic `kitchen.sla_warning`.

### Script read

Kitchen service is responsible for KDS, which is the ticket display screen for the kitchen or bar. When Kitchen service receives event `order.confirmed` from Kafka, it reads the list of items in the order and creates corresponding tickets.

An important point is that not all items go to the same station. Dishes can go into the kitchen, drinks can go into the bar. Kitchen service can route tickets by station so that CHEF only sees kitchen tickets, BARISTA only sees drink tickets.

KDS queue state is saved in Redis. Redis is suitable here because KDS needs quick updates, sorting by time, and continuous status manipulation such as pending, processing, ready, served. Redis also supports pubsub to notify that the queue has changed.

When the queue changes, Kitchen can publish information via Redis pubsub. BFF Realtime Gateway listens to this channel and pushes updates via Socket.IO to the Management App. Thanks to that, the kitchen screen can update almost instantly without needing the user to refresh.

Additionally, Kitchen service has worker SLA. If a ticket exceeds the allowed processing time, the service publishes event `kitchen.sla_warning` to Kafka. BFF Kafka Bridge consumes this event and pushes it realtime to the relevant manager screen or station. This mechanism helps managers detect late orders.

---

## 19. Item status update stream

### Main idea to say

Main stream:

1. CHEF or BARISTA operate the ticket on KDS.
2. Management App calls BFF.
3. BFF calls Kitchen service via TCP 3207.
4. Kitchen updates tickets in Redis.
5. Kitchen calls or synchronizes with Order service when needing to update item order status.
6. BFF realtime pushes new status to staff/customer.

### Script read

When the chef or barista operates on the KDS, for example moving a ticket from pending to processing, or from processing to ready, the request goes from Management App to BFF, then BFF calls Kitchen service via TCP 3207.

Kitchen service updates the ticket status in Redis, because Redis is where the KDS queue is kept. If this status affects the order item, Kitchen can synchronize with the Order service via TCP 3201 so that the Order service can update the item's business status.

After the status changes, BFF Realtime Gateway pushes updates to related rooms. Staff can see that the dish is ready to serve. The customer can also see the updated order status if the system displays it to the customer.

The point to explain here is that KDS is not just a static display. It is part of the operational workflow: ticket receiving, station assignment, status updates, late alerts, and realtime push to relevant roles.

---

## 20. VietQR payment flow through SePay

### Main idea to say

Main stream:

1. Customer or staff requests payment.
2. BFF calls Payment service.
3. Payment gets the snapshot bill from Order service.
4. Payment creates VietQR URL according to account, bank, amount, description.
5. Client displays QR image from SePay.
6. Customers transfer money.
7. SePay sends webhook to BFF.
8. BFF checks webhook auth, forwards to Payment.
9. Payment match bill ref, record payment, call Order mark paid, publish `payment.completed`.

### Script read

The online payment flow is designed around VietQR and SePay webhooks.

When a guest or employee requests payment, the frontend calls BFF. BFF calls Payment service via TCP 3208. Payment service needs to know how much the current bill is, so this service calls Order service via TCP 3201 to get a snapshot of the bill.

After having the bill snapshot, Payment service creates a VietQR image URL. This URL contains information about the receiving account, bank, amount and transfer content. The transfer content has a bill reference code, for example prefix `QRTBL`, so that when the webhook returns, the system can know which bill this transaction belongs to.

Frontend receives the URL and displays a QR image for customers to scan with the banking app. Note here that the system does not necessarily call the API to create a complex payment session like an online payment gateway. With this VietQR model, the QR is a bank transfer image with a specific amount and content.

After the customer transfers money, SePay detects the money transaction to the bank account and sends a webhook to BFF's endpoint: `/api/v1/payment/sepay/webhook`. The direct route currently uses HMAC raw-body, while the tenant/platform route after Phase 4B uses its own `x-secret-key` path. BFF checks this auth to ensure the request actually comes from the configured endpoint.

After authenticating the webhook, BFF forwards the payload to Payment service via TCP 3208. Payment service checks the transaction is money in, matches the bill code from field `code` or transfer content, checks whether the amount is enough, handles anti-duplication, records payment and audits into PostgreSQL.

The Payment service then has two ways to update the Order. The quick way is to call Order service via TCP to mark bill paid immediately. The sustainable direction is to publish event `payment.completed` to Kafka via outbox. Order service consumes this event as a recovery or asynchronous path. BFF can also consume events to push in real time to let customers and staff know the payment has been completed.

This flow makes payments both user-friendly in Vietnam and has an automated webhook mechanism that eliminates the need for staff to manually confirm each transfer transaction.

---

## 21. Cash payment and refund flow

### Main idea to say

- Cash payment is made by staff on Management App.
- Payment service is still where payment is recorded.
- Refund requires higher permissions, usually Owner/MANAGER.
- Payment history helps staff look up bills.

### Script read

In addition to VietQR, the system also supports cash payment. In this flow, the employee operates on the Management App, the request goes through BFF and then to Payment service. Payment service records payment method, payment status and corresponding audit.

The important point is that whether paying by QR or cash, Payment service is still the service that owns the payment data. Order service does not record the payment itself, but only receives the final result to update the bill status.

For refunds, the system requires higher permissions. According to the permission matrix, permissions such as `payment.refund` usually belong to Owner, MANAGER or SUPER_ADMIN, and are not granted to all employees. This is reasonable because refund is a financially sensitive operation.

Staff may have the right to view payment history to assist customers or look up bills. But high-risk operations are limited using RBAC.

---

## 22. Table status flow and table transitions

### Main idea to say

Table life cycle:

1. Available: table is ready.
2. Occupied: the customer has scanned the QR and has a session.
3. Billing: customer requests payment.
4. Cleaning: after payment, wait for the table to be cleared.
5. Available: staff marks the table as ready again.

Switching tables requires coordinating Order, Catalog and Redis.

### Script read

In a restaurant system, tables are not just static data. Tables have a state lifecycle.

Initially the table is in the Available state. When the customer scans the QR and starts the session, the table switches to Occupied. When a customer requests payment, the table can switch to Billing to lock or limit additional orders. After payment is completed, the table moves to Cleaning. When the employee finishes cleaning and marks ready, the table returns to Available.

Because table data belongs to the Catalog service, while sessions and orders belong to the Order service, operations such as table transfers need to coordinate multiple services. When switching tables, the system must update session/order in Order service, update status or table binding in Catalog service, and update session/cart metadata in Redis.

This is an example that shows that not all operations fit into a single database transaction. With microservices, when the business involves many services, the system needs to be designed according to saga or compensation. This means that if a step in between fails, the system has a compensation mechanism or rollback logic to avoid a misaligned state.

At the presentation level, it can be explained simply: table transfer is a distributed operation, because it affects tables, sessions, orders and caches. Therefore, the system does not allow services to self-correct each other's databases, but coordinates through clear API/service calls.

---

## 23. Realtime: WebSocket, Kafka bridge and Redis pubsub

### Main idea to say

- WebSocket is used to push information from the server to the client.
- BFF is where the Socket.IO connection is held.
- Kafka is used for business events between services.
- Redis pubsub is used for KDS queue changed and Socket.IO adapter.
- Room helps send to the right people: customer session, staff tenant, KDS station, manager.

### Script read

Realtime is an important part of QRTable because the restaurant needs to see changes immediately: new order, ready dish, kitchen ticket past SLA, successful payment.

The system uses Socket.IO at BFF Realtime Gateway. Client connects to namespace `/orders`. BFF divides users into rooms. Customer is in room according to session. Staff are located in rooms according to tenants. KDS has rooms according to stations such as kitchen or bar. Manager has room to receive general warnings.

However, not all realtime events are generated directly from HTTP requests. Some events are generated from Kafka, for example `payment.completed` or `kitchen.sla_warning`. So BFF has a Kafka bridge to consume these events and then emit them via Socket.IO.

Some KDS events go through Redis pubsub. For example, Kitchen updates the queue in Redis and publishes the queue changed signal. BFF listens to that signal and then sends it to the KDS screen.

In other words, Kafka is the backbone for business events between services, Redis pubsub supports quick updates during runtime, and Socket.IO is the final channel to push data to the user browser.

---

## 24. Why use TCP, gRPC, and Kafka?

### Main idea to say

- HTTP REST: client calls BFF.
- TCP: BFF/service calls internal service when immediate results are needed.
- gRPC: clear contract authentication/auth, many calls, need stricter schema.
- Kafka: asynchronous events, reduced coupling, fan-out, post-processing.
- WebSocket: server pushes to frontend.

### Script read

A common question is why systems use so many communication mechanisms instead of just one.

The answer is that each mechanism serves a different purpose.

HTTP REST is used at the system edge, between the frontend and the BFF. This is a popular method, easy to debug, and easy to integrate with the browser and Swagger documentation.

TCP is used for internal communication between BFF and microservices. With NestJS microservices, TCP transport helps call internal services more compact than each service having to publicize REST API for each other. Requests such as getting a menu, sending an order, and creating a payment all need immediate results, so TCP is suitable.

gRPC is used for auth, specifically Authorizer and User Access, because the authentication flow needs a clear contract, has a proto schema, and is often called. gRPC helps define stricter interfaces for functions such as verify token or get user access context.

Kafka is used for asynchronous events. When Order confirms the order, it should not wait for Kitchen to finish processing. When Payment completes, it should not call multiple different services. Instead, the service publishes the event and the consumers handle it independently. This method reduces coupling and supports future expansion, for example, adding Notification or Analytics just requires subscribing to the event.

WebSocket is used to push data from the server to the frontend. If there is only HTTP REST, the frontend must continuously poll to know if there are new orders or tickets. WebSocket helps the system respond more naturally in a restaurant environment.

---

## 25. Kafka and Outbox Pattern

### Main idea to say

- Kafka main topics: `order.confirmed`, `order.status_changed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`.
- Kafka uses at-least-once, consumers need idempotent.
- Outbox helps avoid losing events when the database commit is successful but Kafka publish fails.

### Script read

Kafka in the system is not used for everything, but for business events that need to separate services or need many consumers.

For example, `order.confirmed` is an important event. When Order service confirms the order, Kitchen service needs to create a ticket. Notification service can also send notifications later. If using Kafka, the Order service only needs to publish an event, and any service that is interested can subscribe.

Another event is `payment.completed`. When payment is completed, Order service needs to update the bill, BFF needs to push realtime, Notification service can send a receipt in the future. This is fan-out, meaning an event can have many independent consumers.

Kafka often guarantees at-least-once, meaning that messages can be processed more than once in some error situations. So the consumer must be idempotent. Idempotent means processing the same event twice without corrupting the data. For example, if Kitchen receives duplicate `order.confirmed`, you cannot create two identical tickets for the same order.

To increase reliability, the system uses the Outbox Pattern idea. When the service writes business data to the database, it also writes an outbox row in the same transaction. Then a publisher reads the outbox and publishes Kafka. This method reduces the risk of the database being committed but the event not being published due to a service crash or network error.

Simple explanation: outbox is like a to-do list. The service records what happened first, then the background process sends the event to Kafka later. If you submit an error, you can retry.

---

## 26. Redis in the system

### Main idea to say

Redis is used for:

- Guest session/cache.
- Cart state by tenant and session.
- Token/auth cache.
- Rate limit.
- KDS queue and ticket state.
- Redis pubsub for realtime.
- Socket.IO adapter when there are multiple BFF instances.

### Script read

Redis is used in many places because the restaurant system has a lot of data that needs to be read/written quickly.

First is the session and the customer's cart. When customers add items, edit quantities, or delete items, these operations happen continuously. If you write heavily to the database every time, the system will be slow and waste resources. Redis helps save snapshots or temporary state faster.

Second is cache. Some data such as verification tokens, session lookups or menus can be cached to reduce the number of calls to the database or other services.

Third is the KDS queue. The kitchen screen needs a fast, orderly queue, with continuous status updates. Redis is suitable for this data type, especially when sorted sets or hashes are needed.

Fourth is pubsub and Socket.IO adapter. When there are multiple BFF instances, Socket.IO needs a Redis adapter to ensure that event emits from one instance still reach clients connected to another instance. Redis pubsub also helps BFF receive queue changed signals from Kitchen.

So Redis is not just a simple cache, but an important runtime component for sessions, carts, realtime and KDS.

---

## 27. Data consistency and error handling mechanism

### Main idea to say

- There is no single transaction across all services.
- Each service ensures transactions in its database.
- Cross-service uses event, outbox, idempotency, retry and compensation.
- The system accepts eventual consistency in some streams.

### Script read

In microservices architecture, one point that needs to be clearly explained is that the system does not use a single database transaction to cover all services. For example, when payment is successful, Payment service updates the payment database, Order service updates the bill, and BFF realtime notifies the frontend. These are not covered by a single ACID transaction.

Instead, each service ensures consistency within its data. Payment service ensures that its payments and audits are correct. Order service ensures that its orders and bills are correct. When synchronization between services is needed, the system uses TCP for the fast path and Kafka events for the persistent path.

Because Kafka can resend messages, consumers need to be idempotent. Because the service or network may fail, important operations require timeout, retry or outbox. With some operations such as table transfers, if multiple services are affected, the system needs compensation to avoid data deviation.

The important concept here is **eventual consistency**. This means that data between services may be completely out of sync for a few milliseconds or seconds, but will eventually reach the correct state through events and retries. This is a common trade-off in microservices in exchange for scalability and reduced dependencies between services.

---

## 28. Security and access control

### Main idea to say

- Staff uses JWT from Keycloak.
- Customer uses QR/session scope.
- tenant context required in request.
- Permission controls specific actions.
- SePay webhook uses auth route: direct HMAC or tenant/platform `x-secret-key`.

### Script read

Security in the system is divided according to each type of actor.

For staff, managers and admins, the system uses JWT from Keycloak. Each request sent to BFF must include a token. BFF checks the token, tenant and permission before allowing the operation.

For customers, the system does not require login. Instead, customers are limited to QR/session. Guests can only operate on the session of the table they are using. For example, a customer cannot view the bill of another table or another tenant without a valid session.

With multi-tenancy, tenant context is required. All important business data is tied to the tenant. This is a layer of protection to prevent restaurant data from being mixed.

With SePay payment, the external webhook must pass auth according to the route being used: direct HMAC or tenant/platform `x-secret-key`. BFF checks auth before transferring payload to Payment service. Thanks to that, outsiders cannot successfully simulate payment webhooks without knowing the configured secret.

Overall, the system not only protects at one login point, but controls at many layers: identity, tenant, permission, session and provider secret.

---

## 29. Summarize important communication flows

### Short reading script

If you need to summarize the entire flow of communication in one paragraph, you can say the following:

Users interact with the Customer PWA or Management App. These two applications call BFF using HTTP REST and receive realtime using Socket.IO. BFF is the single gateway, responsible for authentication, authorization, tenant identification and dispatching requests to microservices. BFF calls internal services mainly using TCP: Catalog for menu and table, Order for session/order/bill, Kitchen for KDS, Payment for payment, SaaS for tenant, User Access for user/role/permission. Token authentication alone goes through the Authorizer using gRPC.

Services that own their own data: Catalog, Order, Payment and SaaS using PostgreSQL; User Access uses MongoDB; Redis is used for sessions, carts, caches, KDS and realtime pubsub. For operations that need asynchronous processing, services publish approved Kafka topics: Order publishes `order.confirmed` and `order.status_changed`, Kitchen publishes `kitchen.sla_warning`, Payment publishes `payment.completed`, and SaaS publishes `tenant.created`. BFF consumes selected events to push realtime hints to the frontend. External providers include Keycloak for login, Cloudinary for menu images, and SePay for VietQR/payment webhooks.

---

## 30. Implemented section and orientation section

### Main idea to say

- Implemented core services: BFF, Authorizer, User Access, SaaS, Catalog, Order, Kitchen, Payment.
- Already has local provider infrastructure: PostgreSQL, MongoDB, Redis, Kafka, Keycloak.
- There are main flows: catalog, order, kitchen/KDS, realtime, payment phase 3.
- Notification and observability are expansion/hardening directions.

### Script read

Regarding deployment status, the system currently has main services: BFF, Authorizer, User Access, SaaS, Catalog, Order, Kitchen and Payment. These services have their own HTTP port to run independently and TCP/gRPC port for internal communication.

Local infrastructure built with Docker Compose includes PostgreSQL, MongoDB, Redis, Kafka and Keycloak. These are important components to simulate a microservices environment during development.

The main business flows have been designed and implemented in each phase: Catalog for menus and tables; Order for session, cart, order and bill; Kitchen/KDS for kitchen and realtime processing; Payment phase 3 for VietQR, webhooks, cash payment and refund.

Some parts are extension or hardening, for example Notification service, observability stack like Prometheus, Grafana, Loki, Tempo, or more advanced saga/outbox mechanisms for production. When presenting, you should clearly state that this is the next development direction, so as not to mislead the committee into thinking that all parts of the roadmap have been completed at the production level.

---

## 31. Conclusion for the architecture section

### Script read

To summarize, the QRTable architecture is designed around three main goals.

The first goal is to suit the multi-tenant SaaS problem. The system needs to serve multiple restaurants on the same platform, but still ensure the data, permissions and configuration of each tenant are kept separate.

The second goal is to separate the business into microservices. Each service is in charge of a clear domain: Catalog manages menus and tables, Order manages orders and bills, Kitchen manages the kitchen, Payment manages payments, User Access and Authorizer manages users and decentralizes permissions, and SaaS manages tenants. This makes the system easy to scale, easy to maintain, and reduces the impact when a part changes.

The third goal is to choose the appropriate communication mechanism for each type of problem. HTTP REST is used for the frontend, TCP is used for internal requests that need to respond immediately, gRPC is used for authentication with a clear contract, Kafka is used for asynchronous events between services, Redis is used for hot and realtime data, Socket.IO is used to push updates to the client.

Thanks to this design, QRTable is not just a QR ordering application, but a restaurant operating platform with a clear, scalable architecture and a technical foundation suitable for a modern SaaS system.

---

## 32. Questions the panel can ask and suggested answers

### 32.1 Why not make a monolith backend for simplicity?

**Suggested answer:**

If you only do a small demo, monolith is simpler. But the topic focuses on microservices architecture for SaaS platforms. The system has many independent business domains such as Catalog, Order, Kitchen, Payment, User Access. If put together in a large backend, the parts are easy to depend on each other, difficult to expand and difficult to explain the boundary. Microservices help separate responsibilities, each service owns its own data and communicates through clear contracts. In return, the system is more complex, so I use BFF, Kafka, Redis and Docker Compose to manage that complexity.

### 32.2 Why doesn't the frontend call each microservice directly?

**Suggested answer:**

If the frontend calls each service directly, the frontend must know too many backend details: which service, which port, which service handles which business, how to auth. That makes the frontend coupled with microservices. BFF solves this problem by making a single gateway. Frontend only calls BFF, and BFF routes down to the appropriate service, checking auth, tenant, permission and realtime.

### 32.3 Why use TCP and Kafka?

**Suggested answer:**

TCP is used for requests that need immediate results, for example BFF asks Order service to create an order or Payment asks Order to get a bill snapshot. Kafka is used for events that do not need to wait immediately and can have many consumers, for example `order.confirmed` for Kitchen to create tickets, or `payment.completed` for Order to update bills and BFF push in real time. The two mechanisms serve two different types of communication.

### 32.4 Why use Redis?

**Suggested answer:**

Redis is used for hot and realtime data: session, cart, cache, KDS queue, pubsub and Socket.IO adapter. This data needs quick access and changes continuously. If it all went through PostgreSQL the system would be heavier and respond slower.

### 32.5 Why use Keycloak instead of writing your own login?

**Suggested answer:**

Keycloak is a standard IAM system, supporting OAuth2/OIDC, JWT, realm, client and admin APIs. Writing your own login will take a lot of effort and may lack standard security features. In this topic, I focus on POS/QR ordering and microservices architecture, so using Keycloak for identity is a reasonable choice.

### 32.6 Does restaurant data overlap?

**Suggested answer:**

No. The system uses tenant context and `tenant_id` on business data. Each request has its tenant identified from JWT or QR/session. Common roles such as Owner, MANAGER, WAITER, CHEF, BARISTA only operate within their tenant. New SUPER_ADMIN has cross-tenant scope for platform administration.

### 32.7 What if Kafka sends duplicate events?

**Suggested answer:**

The system is designed in an at-least-once direction, which means the priority is not to lose events, but may receive duplicates in some error cases. So consumers need idempotent. For example, if Kitchen receives duplicate `order.confirmed`, you must check to not create two tickets for the same order. This is a common trade-off in event-driven systems.

### 32.8 What if SePay sends fake webhooks?

**Suggested answer:**

SePay webhook must pass auth according to the route being used: direct HMAC or tenant/platform `x-secret-key`. BFF checks this auth before transferring the payload to the Payment service. Payment service also checks whether the transaction is money in, whether the bill code matches, whether the amount is enough, and whether there are duplicates.

---

## 33. Script shortened to 3 minutes

If you need a very short presentation, you can read the following paragraph:

QRTable is a SaaS POS platform for restaurants that allows guests to scan QR at the table to view menus, order, track status, and pay. Restaurants use Management App to operate POS, KDS, menu, table, staff and payment management.

Regarding architecture, the system uses microservices and has BFF as the only gateway. Frontend just calls BFF via HTTP REST and receives realtime via Socket.IO. BFF is responsible for authentication, authorization, tenant identification and coordinating requests to downstream services.

Main services include Catalog for menu and table management, Order for session management, cart, order and bill, Kitchen for KDS management, Payment for VietQR/webhook/cash/refund processing, SaaS for tenant management, User Access for user-role-permission management, Authorizer for token authentication with Keycloak. BFF calls services mainly using TCP, only auth uses gRPC. Business events such as `order.confirmed`, `kitchen.sla_warning`, `payment.completed` go through Kafka. Redis is used for sessions, carts, caches, KDS queues and realtime pubsub.

The main flow is: client scans QR to create session; BFF gets the menu from the Catalog; Customers submit orders via Order service; staff confirms the application; Order emits event `order.confirmed`; Kitchen receives events to create KDS tickets; Updates are pushed realtime via BFF. When paying, Payment creates VietQR, SePay sends a webhook to BFF, Payment confirms the transaction, updates the bill and broadcasts `payment.completed`.

The important point of the architecture is that the system clearly separates business domains, data is isolated by tenant, decentralized using RBAC, communication is chosen according to the right purpose: REST for clients, TCP/gRPC for internal needs to respond immediately, Kafka for asynchronous events, Redis for hot data and WebSocket for realtime. Thanks to this, the system is suitable for a SaaS platform that is scalable and easy to maintain.
