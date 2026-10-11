On-device OCR (all local, no CDN): tesseract.js 5.1.1 (Apache-2.0), tesseract.js-core 5.1.0 (Apache-2.0, LSTM-only builds, wasm embedded),
tessdata_fast fas + eng (Apache-2.0, https://github.com/tesseract-ocr/tessdata_fast) gzipped. Loaded lazily by assets/ocr.js only when the user picks an image or a scanned PDF.
