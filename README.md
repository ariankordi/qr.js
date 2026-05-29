# qr.js (Arian fork)
QR code generator in pure JavaScript, originally from 2011. Original repo: https://github.com/lifthrasiir/qr.js

From [the author](https://github.com/lifthrasiir/qr.js/blob/4234f130e5137626f8193aba2132575ae1602f39/README.md?plain=1#L5-L6):
> The code is in the public domain (or to be exact, [Creative Commons Zero](https://creativecommons.org/publicdomain/zero/1.0/)), and you can use it for absolutely any purpose.

This fork modernizes the library a little bit.
* TypeScript + ESLint were added for strong type-checking and styling.
  - The code stays in JavaScript with JSDoc for typing and documentation comments.
* It is now exported as an ES6 module, easily usable from browsers, bundlers, and Node.js.

## Usage

* Install via NPM from git:
```
npm install https://github.com/ariankordi/qr.js#v0.4.0
```

### Including on a web page

1. Without ES modules.
```html
<script src="https://cdn.jsdelivr.net/gh/ariankordi/qr.js@v0.4.0/qr.js"></script>
<script>
  console.debug(QrCode);
</script>
```

2. With ES modules - recommended for new apps.
```html
<script type="importmap">
{
  "imports": {
    "qrjs": "https://esm.sh/gh/ariankordi/qr.js@v0.4.0"
  }
}
</script>
<script type="module">
  import QrCode from 'qrjs';
  console.debug(QrCode);
</script>
```
