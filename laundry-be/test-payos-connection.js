require('dotenv/config');
const PayOS = require('@payos/node');

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY,
);

const orderCode = Date.now();

payos.createPaymentLink({
  orderCode,
  amount: 2000,
  description: 'Test ket noi PayOS',
  returnUrl: process.env.PAYOS_RETURN_URL,
  cancelUrl: process.env.PAYOS_CANCEL_URL,
})
  .then((result) => {
    console.log('✅ Kết nối PayOS thành công!');
    console.log('checkoutUrl:', result.checkoutUrl);
    console.log('orderCode:', orderCode);
  })
  .catch((err) => {
    console.error('❌ Kết nối thất bại:', err.message);
    process.exit(1);
  });
