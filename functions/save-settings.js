const Twilio = require("twilio");
const utils = require(Runtime.getAssets()["/utils.js"].path);

const updatePhoneNumber = async (
  accountSid,
  apiKey,
  apiSecret,
  phoneNumber,
  domain
) => {
  const client = new Twilio(apiKey, apiSecret, { accountSid });
  const phoneNumberRecord = (
    await client.incomingPhoneNumbers.list({
      phoneNumber,
    })
  )[0];
  if (phoneNumberRecord) {
    return client.incomingPhoneNumbers(phoneNumberRecord.sid).update({
      smsUrl: `${domain}inbound-sms`,
    });
  } else {
    throw new Error(
      `Could not find the phone number "${phoneNumber}" using the provided credentials.`
    );
  }
};

exports.handler = async function (context, event, callback) {
  const [success, claims] = await utils.decode(event.jwt, context);
  if (!success) {
    console.error(claims);
    callback(claims);
    return;
  }
  const clientKey = claims.iss;
  const { phoneNumber, apiKey, apiSecret, accountSid } = event;
  await utils.updateOrCreateDocument(context, utils.settingsKey(clientKey), {
    phoneNumber,
    apiKey,
    apiSecret,
    accountSid,
  });
  try {
    await updatePhoneNumber(
      accountSid,
      apiKey,
      apiSecret,
      phoneNumber,
      context.BASE_URL || context.DOMAIN
    );
    const doc = await utils.updateOrCreateDocument(context, phoneNumber, {
      clientKey,
    });
    console.log(doc);
    callback(null, { success: true });
  } catch (error) {
    callback(null, { success: false, message: error.message });
  }
};
