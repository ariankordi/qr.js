# qr.js (Arian fork)
QR code generator in pure JavaScript, originally from 2011.
Source repo: https://github.com/lifthrasiir/qr.js

From [the author](https://github.com/lifthrasiir/qr.js/blob/4234f130e5137626f8193aba2132575ae1602f39/README.md?plain=1#L5-L6):
> The code is in the public domain (or to be exact, [Creative Commons Zero](https://creativecommons.org/publicdomain/zero/1.0/)), and you can use it for absolutely any purpose.

This fork modernizes the library a little bit.
* ESLint + TypeScript are used for strong typing and code style.
  - The code remains in JavaScript with JSDoc types and documentation comments.
  - Type annotations should also work with the Google Closure Compiler.
* The library is exported as an ES6 module.
  - This makes it easily usable from browsers, bundlers, and Node.
* Unit tests were added with ~86% branch coverage.

## Usage

* Install via NPM from GitHub:
```
npm install qrjs@github:ariankordi/qr.js#v0.4.1
```

### Including on a web page

1. Without ES modules.
```html
<script src="https://cdn.jsdelivr.net/gh/ariankordi/qr.js@0.4.1/dist/qr.min.js"></script>
<script>
	console.debug(QRCode);
	document.body.appendChild(QRCode.generateHTML('Hello 👋', {ecclevel: 'H'}));
</script>
```

2. With ES modules - recommended for new apps.
```html
<script type="importmap">
{
  "imports": {
    "qrjs": "https://esm.sh/gh/ariankordi/qr.js@v0.4.1"
  }
}
</script>
<script type="module">
	import QRCode from 'qrjs';
	console.debug(QRCode);
	document.body.appendChild(QRCode.generateHTML('Hello 👋', {ecclevel: 'H'}));
</script>
```
