'use strict';
const QRCode = require('qrcode');

/**
 * Report verification QR. The payload is a verification URL plus an opaque
 * token — never patient identity, because a printed report can be photographed
 * by anyone standing near it.
 */
class QrService {
  constructor({ config }) { this.config = config; }

  verificationUrl(qrToken) {
    return `retinaguard://verify/${qrToken}`;
  }

  async toDataUrl(qrToken) {
    return QRCode.toDataURL(this.verificationUrl(qrToken), {
      errorCorrectionLevel: 'M', margin: 1, width: 240,
    });
  }

  async toBuffer(qrToken) {
    return QRCode.toBuffer(this.verificationUrl(qrToken), {
      errorCorrectionLevel: 'M', margin: 1, width: 240, type: 'png',
    });
  }
}

module.exports = QrService;
