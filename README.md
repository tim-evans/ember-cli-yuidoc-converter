And ember-cli addon used by https://github.com/trek/ember-api to
preprocesses the JSON data emitted by YUIDoc, which is fairly
tightly coupled to their page generation needs.

This takes a YUIDoc data JSON object and emits an directory/file structure
like this:

```txt
  // Containing a list of all classes, namespaces, and modules by name property.
  index.json

  // for every class/namespace:
  KlassName.json
  KlassName/
    index.json
    methods.json
    properties.json
    events.json

  // for every module
  modules/
    module-name.json
    other-module-name.json
```

This can then be read by a web application later.

Ideally some day we'd write a pluggable markdown-based documentation tool
that only emits a sensible JSON structure and leave file generation up to
the consumer (i.e. does on thing well).

