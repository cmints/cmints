"use strict";

const noaction = () => {};

const build = (handlers) => {
  if (handlers.length === 0) {
    return noaction;
  }

  const [current, ...remaining] = handlers;
  const next = build(remaining);

  return (req, res) => current(req, res, () => Promise.resolve(next(req, res)));
};

const composeMiddleware = (...handlers) => {
  return (req, res) => Promise.resolve(build(handlers)(req, res));
};

const logRequestUrl = (req, res, next) => {
  console.log(`Serving: ${req.url}`);
  next();
};

module.exports = {composeMiddleware, logRequestUrl};