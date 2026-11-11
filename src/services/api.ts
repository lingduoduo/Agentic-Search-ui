// Compatibility facade. HTTP implementations live in domain services;
// request/response data types are exported separately from ../models.
export * from "./admin";
export * from "./auth";
export * from "./agent";
export * from "./chat";
export * from "./history";
export * from "./search";
export * from "./debug";
export * from "./tools";
export { errorStatus } from "../utils/request";
