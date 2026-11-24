/**
 * =========================================================================
 * UMANG 2026 - Motihari College of Engineering
 * Email Verification & Gmail Delivery Service
 * =========================================================================
 *
 * HOW TO USE THIS SCRIPT:
 * 1. In Google Apps Script Editor, click '+' next to Files > Script > Name it 'EmailVerification'.
 * 2. Paste this code.
 * 3. In the toolbar function dropdown, select 'testGmailDeliveryNow' and click 'Run'.
 *    - Google will show a one-time 'Authorization required' popup.
 *    - Click 'Review permissions' > Choose your Google account > 'Advanced' > 'Go to UmangPortal (unsafe)' > 'Allow'.
 *    - You will immediately receive a test email in your inbox confirming MailApp works!
 * 4. Deploy as Web App (Manage deployments > Edit > Version: New version > Deploy).
 */

/**
 * Run this function directly inside the Google Apps Script editor (Click Run ▶)
 * to test sending an email and authorize MailApp permissions.
 */
function testGmailDeliveryNow() {
  const recipient = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  Logger.log("Testing Gmail dispatch to: " + recipient);

  if (!recipient) {
    throw new Error("No Google user email found. Please pass an email address to MailApp.sendEmail.");
  }

  const subject = "[UMANG 2026] Gmail Service Test - MCE Motihari";
  const htmlBody = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;padding:24px;">
      <div style="background:linear-gradient(135deg,#881337 0%,#be123c 100%);color:#ffffff;padding:16px;text-align:center;border-radius:8px;margin-bottom:16px;">
        <h2 style="margin:0;font-size:20px;">Gmail Service Test</h2>
        <p style="margin:4px 0 0 0;font-size:12px;opacity:0.9;">UMANG 2026 • Motihari College of Engineering</p>
      </div>
      <h3 style="color:#059669;margin-top:0;">Delivery Successful! ✅</h3>
      <p>This test email confirms that your Google Apps Script <strong>MailApp / Gmail service</strong> is active, authorized, and sending emails properly from your Google account.</p>
      <p style="background:#f8fafc;padding:10px;border-radius:6px;font-size:12px;color:#475569;margin:16px 0;">
        <strong>Sender:</strong> ${recipient}<br/>
        <strong>Timestamp:</strong> ${new Date().toISOString()}
      </p>
      <p style="font-size:12px;color:#94a3b8;margin:0;">Motihari College of Engineering Cultural Fest Committee</p>
    </div>
  `;

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlBody
  });

  Logger.log("SUCCESS! Test email sent to: " + recipient);
}

/**
 * Sends a 6-digit verification code to the captain's email to verify delivery before team registration.
 */
function sendCaptainEmailVerification(email, captainName, eventName) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { ok: false, error: "Invalid email address format." };
  }

  // Rate limiting per address: max 5 requests per 5 minutes
  const cache = CacheService.getScriptCache();
  const rlKey = "rl_otp_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  const count = parseInt(cache.get(rlKey) || "0", 10);
  if (count >= 5) {
    return { ok: false, error: "Too many verification requests. Please wait 5 minutes before trying again." };
  }
  cache.put(rlKey, String(count + 1), 300);

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  cache.put("verify_otp_" + cleanEmail, code, 900); // 15 mins

  try {
    const subject = `[UMANG 2026] Verification Code: ${code} - Confirm Your Gmail`;
    const htmlBody = `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#ffffff;padding:24px;">
        <div style="background:linear-gradient(135deg,#881337 0%,#be123c 50%,#ea580c 100%);color:#ffffff;padding:20px;text-align:center;border-radius:10px;margin-bottom:20px;">
          <h2 style="margin:0;font-size:22px;letter-spacing:1px;">UMANG 2026</h2>
          <p style="margin:4px 0 0 0;font-size:13px;opacity:0.9;">Motihari College of Engineering Cultural Fest</p>
        </div>
        
        <h3 style="color:#be123c;margin-top:0;">Confirm Your Gmail Address</h3>
        <p>Dear <strong>${captainName || "Captain"}</strong>,</p>
        <p>You are registering a team for <strong>${eventName || "Cultural Fest"}</strong>. Please use the verification code below on the registration portal to confirm that your Gmail delivers messages properly:</p>
        
        <div style="background:#fff1f2;border:2px dashed #f43f5e;border-radius:12px;padding:18px;text-align:center;margin:24px 0;">
          <span style="font-size:12px;text-transform:uppercase;color:#881337;font-weight:bold;letter-spacing:1px;">Your 6-Digit Confirmation Code</span>
          <div style="font-size:36px;font-family:monospace;letter-spacing:8px;font-weight:bold;color:#be123c;margin-top:8px;">
            ${code}
          </div>
        </div>
        
        <p style="font-size:13px;color:#475569;line-height:1.6;">
          Once confirmed on the portal, your team registration will be completed, and your captain account password will be sent to this exact email address.
        </p>
        
        <div style="background:#f8fafc;padding:12px;border-radius:8px;font-size:12px;color:#64748b;margin:16px 0;">
          • <strong>Recipient:</strong> ${cleanEmail}<br/>
          • <strong>Validity:</strong> 15 minutes<br/>
          • If you did not request this code, you can safely ignore this email.
        </div>
        
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0 16px 0;"/>
        <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">
          Organizing Committee • Motihari College of Engineering, Motihari
        </p>
      </div>
    `;

    MailApp.sendEmail({
      to: cleanEmail,
      subject: subject,
      htmlBody: htmlBody
    });

    return {
      ok: true,
      data: {
        email: cleanEmail,
        message: "Test verification email sent to " + cleanEmail + "! Please check your inbox or spam folder."
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: "Gmail delivery failed: " + err.toString() + ". Make sure you have authorized MailApp permissions in Apps Script."
    };
  }
}

/**
 * Confirms the 6-digit OTP code entered by the captain.
 */
function verifyCaptainEmailCode(email, code) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();

  const cache = CacheService.getScriptCache();
  const cachedCode = cache.get("verify_otp_" + cleanEmail);

  if (!cachedCode) {
    return { ok: false, error: "Verification code expired or not found. Please click 'Send Verification Code' again." };
  }

  if (cachedCode !== cleanCode) {
    return { ok: false, error: "Incorrect verification code. Please check your Gmail and enter the 6 digits again." };
  }

  // Validated! Mark as verified for 1 hour
  cache.put("verified_email_" + cleanEmail, "TRUE", 3600);
  cache.remove("verify_otp_" + cleanEmail);

  return { ok: true, data: { verified: true, message: "Gmail confirmed successfully!" } };
}
