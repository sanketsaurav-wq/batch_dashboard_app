const Imap = require("imap");
const { simpleParser } = require("mailparser");
const config = require("./config");

function cleanBody(text) {
  if (!text) return "";

  return text
    .replace(/(Sent from my|Get Outlook for|Exported from).*/gi, "")
    .replace(/This email and any files transmitted with it are confidential.*/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

function fetchEmails() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.IMAP_USER,     
      password: config.IMAP_PASS,   
      host: config.IMAP_HOST,
      port: config.IMAP_PORT,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    let emails = [];

    imap.once("ready", function () {
      imap.openBox("zimple", true, (err, box) => {
        if (err) return reject(err);

        const searchCriteria = [
          'ALL',
          ['OR', ['FROM', 'prodnike'], ['FROM', 'preprodnike']]
        ];

        imap.search(searchCriteria, (err, results) => {
          if (err) return reject(err);

          if (!results || results.length === 0) {
            console.log("No matching emails found in zimple.");
            imap.end();
            return resolve([]);
          }

          const targetedResults = results.slice(-50); 
          
          const f = imap.fetch(targetedResults, { bodies: "", struct: true });

          f.on("message", (msg) => {
            let attributes = {};
            
            msg.once("attributes", (attrs) => {
              attributes = attrs;
            });

            msg.on("body", (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (err) return;

                emails.push({
                  uid: attributes.uid,
                  flags: attributes.flags,
                  date: parsed.date || "",
                  subject: parsed.subject || "(No Subject)",
                  from: parsed.from?.text || "",
                  to: parsed.to?.text || "",
                  cc: parsed.cc?.text || "",
                  // body: cleanBody(parsed.text),
                  attachmentCount: parsed.attachments?.length || 0,
                  messageId: parsed.messageId
                });
              });
            });
          });

          f.once("end", () => {
            emails.sort((a, b) => new Date(b.date) - new Date(a.date));
            imap.end();
          });
        });
      });
    });

    imap.once("error", (err) => {
      console.error("IMAP Error:", err);
      reject(err);
    });

    imap.once("end", () => {
      resolve(emails);
    });

    imap.connect();
  });
}

module.exports = { fetchEmails };