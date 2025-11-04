import crypto from 'crypto';

const PAYFAST_CONFIG = {
  merchantId: '10043379',
  merchantKey: 'cv55nate9wgnf',
  passphrase: 'I-love-payfast'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = req.body;
  
  // Verify signature
  let pfOutput = '';
  for (let key in data) {
    if (data.hasOwnProperty(key) && key !== 'signature') {
      if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
        pfOutput += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&`;
      }
    }
  }
  
  let getString = pfOutput.slice(0, -1);
  getString += `&passphrase=${encodeURIComponent(PAYFAST_CONFIG.passphrase.trim()).replace(/%20/g, '+')}`;
  
  const calculatedSignature = crypto.createHash('md5').update(getString).digest('hex');
  
  if (calculatedSignature !== data.signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Payment verified - process it
  if (data.payment_status === 'COMPLETE') {
    // TODO: Add tokens to user account in Supabase
    console.log('Payment complete:', {
      userId: data.custom_str2,
      tokens: data.custom_int1,
      amount: data.amount_gross
    });
  }

  res.status(200).send('OK');
}
