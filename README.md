# Ember CLI Search Command

This adds a `search` command to ember-cli. To view more information run `ember search --help`. It currently supports 3
search modes: addon discovery, code discovery, and code exploration which are explained below.

## Addon Discovery

The addon discovery mode allows you to search for addons based on a given keyword. This is a great way to discovery
addons within the community:

```
ember search --addon 'i18n'
```

## Code Discovery

The code discovery mode allows you to search all addons that contain a given code snippet. This is great to find other
addons that are using a method or hook that you would like to learn more about. As an example, hooks within your index.js
file such as: `included`, `treeForApp`, `treeForPublic`, etc. are not well documented. Here we can search to find other
addons which are using one of these hooks:

```
ember search --code 'treeForPublic'
```

## Code Exploration

The last mode is code exploration. This allows you to see actual code diffs based on that code snippet. Note that we
must supply the exact addon name via --addon.

```
ember search --addon 'ember-intl' --code 'treeForPublic'
```

### Shortcuts

Both `--addon` and `--code` have the following shortcuts respectfully: `-a` and `-c`. To view more information:
`ember search --help`.

### Ember Observer

The [results](https://emberobserver.com/api/addons) and [code search](https://emberobserver.com/code-search) are powered by [emberobserver.com](emberobserver.com).
