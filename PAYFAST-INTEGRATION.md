# PayFast Integration - VCB Transcription Service

## Overview

PayFast payment gateway has been successfully integrated for token purchases. Users can now buy credits using PayFast's secure payment system.

## Test Account Credentials

**Merchant ID:** `31995055`
**Merchant Key:** `g3kamzqwU6dc0`
**Passphrase:** `Viable_Core_Business_007`
**Mode:** Sandbox (Test Mode)

## Integration Details

### 1. Configuration

File: [vcb-features-enhanced.jsx:98-106](vcb-features-enhanced.jsx#L98-L106)

```javascript
export const PAYFAST_CONFIG = {
  merchantId: '31995055',
  merchantKey: 'g3kamzqwU6dc0',
  passphrase: 'Viable_Core_Business_007',
  returnUrl: `${window.location.origin}${normalizedBasePath}payment-success.html`,
  cancelUrl: `${window.location.origin}${normalizedBasePath}payment-cancelled.html`,
  notifyUrl: `${window.location.origin}${normalizedBasePath}api/payfast/notify`,
  sandbox: true // Set to false when going live
};
```

### 2. Token Packages

File: [vcb-features-enhanced.jsx:89-94](vcb-features-enhanced.jsx#L89-L94)

| Package | Tokens | Price | Discount | Per Token |
|---------|--------|-------|----------|-----------|
| Starter | 1,000 | R 100 | - | R 0.10 |
| Basic | 5,000 | R 450 | 10% | R 0.09 |
| Pro | 10,000 | R 800 | 20% | R 0.08 |
| Enterprise | 50,000 | R 3,500 | 30% | R 0.07 |

### 3. Payment Flow

1. **User selects package** on Token Purchase Page
2. **Form submission** to PayFast sandbox
3. **Payment processing** on PayFast
4. **Redirect to success** or cancel page
5. **Token addition** automatically on return

### 4. Key Features

#### Signature Generation
File: [vcb-features-enhanced.jsx:927-953](vcb-features-enhanced.jsx#L927-L953)

- Uses **CryptoJS MD5** hashing for secure signatures
- Implements PayFast's signature specification
- URL encodes parameters correctly
- Includes passphrase for extra security

#### User Integration
File: [vcb-components-enhanced.jsx:651-749](vcb-components-enhanced.jsx#L651-L749)

- Fetches current Supabase user
- Passes user ID and email to PayFast
- Works for both authenticated users and guests
- Shows notification for guest purchases

#### Payment Success Handler
File: [vcb-transcription-service.jsx:1817-1853](vcb-transcription-service.jsx#L1817-L1853)

- Detects payment success on app load
- Automatically adds tokens to user balance
- Shows success notification
- Clears payment data after processing
- Syncs with IndexedDB and Supabase (if logged in)

### 5. Files Modified

1. **vcb-features-enhanced.jsx**
   - Updated PAYFAST_CONFIG with real credentials
   - Fixed signature generation with proper MD5
   - Added CryptoJS import
   - Updated initiateTokenPurchase function

2. **vcb-components-enhanced.jsx**
   - Updated TokenPurchasePage to fetch current user
   - Added user ID and email to purchase flow
   - Added guest purchase notification

3. **vcb-transcription-service.jsx**
   - Added payment success handler useEffect
   - Automatically processes payment on return
   - Shows toast notifications

4. **package.json**
   - Added crypto-js@^4.2.0
   - Added @types/crypto-js (dev dependency)

## Testing Instructions

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Navigate to Token Purchase Page

1. Open the app in browser
2. Click on "Buy Tokens" or navigate to the purchase page

### Step 3: Select a Package

- Choose any token package (e.g., Starter - 1000 tokens for R100)
- Click "Purchase"

### Step 4: PayFast Sandbox Testing

You'll be redirected to PayFast's sandbox payment page.

**Test Card Details:**
- **Card Number:** 4000 0000 0000 0002
- **CVV:** 123
- **Expiry:** Any future date

Or use PayFast's test credentials provided in their sandbox.

### Step 5: Complete Payment

1. Fill in test card details
2. Complete the payment
3. You'll be redirected back to payment-success.html
4. Tokens will be automatically added to your account

### Step 6: Verify Token Addition

- Check the token balance widget
- Should show the new token count
- Console log will show: "Processing PayFast payment success"
- Toast notification: "X tokens added to your account!"

## Security Features

1. **MD5 Signature** - All payments signed with merchant passphrase
2. **Sandbox Mode** - Test transactions don't process real payments
3. **User Tracking** - Links purchases to Supabase user accounts
4. **Payment Verification** - Validates token amounts before adding
5. **Error Handling** - Graceful fallbacks for failed payments

## Going Live Checklist

When ready to accept real payments:

1. ✅ Change `sandbox: true` to `sandbox: false` in PAYFAST_CONFIG
2. ✅ Update merchant credentials if production differs from test
3. ✅ Test with small real transaction
4. ✅ Verify ITN (Instant Transaction Notification) endpoint
5. ✅ Monitor PayFast dashboard for transactions
6. ✅ Set up proper error logging and monitoring

## ITN (Instant Transaction Notification)

**Note:** ITN endpoint needs to be implemented for production.

The notify_url is currently set to:
```
${window.location.origin}${normalizedBasePath}api/payfast/notify
```

This endpoint should:
1. Verify the PayFast signature
2. Validate payment status
3. Add tokens to user account (server-side)
4. Log transaction to database
5. Send confirmation email

## Troubleshooting

### Payment Not Completing
- Check browser console for errors
- Verify PayFast credentials are correct
- Ensure signature generation is working (check logs)

### Tokens Not Added
- Check localStorage for 'payfastPaymentSuccess'
- Verify payment success page received correct parameters
- Check console logs for processing errors

### Signature Mismatch
- Ensure all parameters are correctly encoded
- Verify passphrase is correct
- Check parameter order (must be alphabetically sorted)

## Support

For PayFast issues:
- **PayFast Support:** support@payfast.co.za
- **PayFast Docs:** https://developers.payfast.co.za

For app issues:
- Check console logs
- Review error messages in toast notifications
- Contact VCB support with PayFast payment ID

---

**Integration Status:** ✅ Complete and Ready for Testing

**Last Updated:** 2025-11-03

**Integrated By:** Claude Code with Vercel AI SDK Architecture
