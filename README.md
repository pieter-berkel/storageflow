Known issues:

- In the router there are AnyTypes named AnyPath and AnyMiddleware. At the moment type never is passed as as generic arguments to these types. This solves a problem that the input is inferred correcctly, when building the router in the path and middleware functions. This creates a new problem inside the request-upload function, where the input is not inferred correctly.
