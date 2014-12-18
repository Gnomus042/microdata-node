'use strict';

var urlUtil = require('url');

function unique(array) {
  return array.reduce(function (uniques, item) {
    if (uniques.indexOf(item) < 0) {
      uniques.push(item);
    }
    return uniques;
  }, []);
}

function splitUnique(string) {
  string = string && string.trim();
  if (string) {
    return unique(string.split(/\s+/));
  } else {
    return undefined;
  }
}

function Item(spec) {
  if (spec.type) {
    this.type = splitUnique(spec.type);
  }

  var idString = spec.id && spec.id.trim();
  if (idString) {
    this.id = idString;
  }

  this.properties = {};
}

Item.prototype.addProperty = function addProperty(name, value) {
  if (!this.properties[name]) this.properties[name] = [];
  this.properties[name].push(value);
};

Item.prototype.serialize = function serialize() {
  var item = {
    properties: {}
  };

  if (this.type) {
    item.type = this.type;
  }

  if (this.id) {
    item.id = this.id;
  }

  Object.keys(this.properties).forEach(function (propName) {
    var values = this.properties[propName];

    var serializedValues = values.map(function (value) {
      if (value instanceof Item) {
        return value.serialize();
      } else {
        return value;
      }
    }, this);

    item.properties[propName] = serializedValues;
  }, this);

  return item;
};



function parse($, config) {

  config = config || {};
  var items = [];

  function walkNode(node, currentItem) {
    var prop = splitUnique(node.attr('itemprop'));

    if (prop) {
      if (currentItem) {
        prop.forEach(function (propName) {
          var value = parseProperty(node);
          currentItem.addProperty(propName, value);
        });
      }
    } else if (node.is('[itemscope]')) {
      var newItem = parseItem(node);
      items.push(newItem);
    }

    node.children().each(function (i, child) {
      walkNode($(child), currentItem);
    });
  }

  function parseItem(node) {
    var item = new Item({
      type: node.attr('itemtype'),
      id: node.attr('itemid')
    });

    node.children().each(function (i, child) {
      walkNode($(child), item);
    });

    return item;
  }

  function resolveAttribute(node, attr) {
    return node.attr(attr) || '';
  }

  function resolveUrlAttribute(node, attr) {
    var relative = node.attr(attr);
    if (relative && config.base) {
      return urlUtil.resolve(config.base, relative) || '';
    } else {
      return relative || '';
    }
  }

  function parseProperty(node) {
    if (node.is('[itemscope]')) {
      return parseItem(node);
    } else if (node.is('meta')) {
      return resolveAttribute(node, 'content');
    } else if (node.is('audio,embed,iframe,img,source,track,video')) {
      return resolveUrlAttribute(node, 'src');
    } else if (node.is('a,area,link')) {
      return resolveUrlAttribute(node, 'href');
    } else if (node.is('object')) {
      return resolveUrlAttribute(node, 'data');
    } else if (node.is('data')) {
      return resolveAttribute(node, 'value');
    } else if (node.is('meter')) {
      return resolveAttribute(node, 'value');
    } else if (node.is('time')) {
      return resolveAttribute(node, 'datetime');
    } else {
      return node.text() || '';
    }
  }

  walkNode($.root());

  return {
    items: items.map(function (item) {
      return item.serialize();
    })
  };
}

exports.parse = parse;
