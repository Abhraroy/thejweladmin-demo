import twilio from "twilio";

export const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendSMS(to: string, message: string) {
    const sms = await client.messages.create({
        body: message,
        from: "+19125755892",
        to: to,
      });
    return sms.body;
}