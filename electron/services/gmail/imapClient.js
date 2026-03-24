const Imap = require("imap");
const { simpleParser } = require("mailparser");

/**
 * 🔥 BODY CLEANER (Removes "Outliers" and Noise)
 * Targets signatures, "Sent from my iPhone", disclaimers, and big empty gaps.
 */
function cleanRawBody(text) {
  if (!text) return "";

  return text
    // 1. Remove "Sent from my iPhone/Android" footers
    .replace(/(Sent from my|Get Outlook for).*/gi, "")
    // 2. Remove common signature separators (e.g., --, ___, ===)
    .split(/\n--\s*\n|\n[-=_]{3,}\n/)[0]
    // 3. Remove common corporate disclaimers (adjust keywords as needed)
    .split(/This email and any files transmitted/i)[0]
    // 4. Collapse multiple newlines into a single clean break
    .replace(/\n\s*\n/g, "\n")
    // 5. Trim whitespace from start and end
    .trim();
}

function fetchEmails() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: "sanket.saurav@o9solutions.com",
      password: "iyxj bfvs xkke losm", 
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    let emails = [];

    imap.once("ready", function () {
      imap.openBox("zimple", true, (err, box) => {
        if (err) return reject(err);

        // Fetching from specific senders only
        const searchCriteria = [
          'ALL',
          ['OR', ['FROM', 'prodnike'], ['FROM', 'preprodnike']]
        ];

        imap.search(searchCriteria, (err, results) => {
          if (err || !results.length) {
            imap.end();
            return resolve([]);
          }

          const f = imap.fetch(results.slice(-50), { 
            bodies: "", 
            struct: true // Required to get metadata like size/flags
          });

          f.on("message", (msg) => {
            let attributes = {};
            
            // Get Server Metadata (Flags, UID, etc.)
            msg.once("attributes", (attrs) => {
              attributes = attrs;
            });

            msg.on("body", (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (err) return;

                emails.push({
                  uid: attributes.uid,
                  flags: attributes.flags,
                  date: parsed.date,
                  subject: parsed.subject || "(No Subject)",
                  from: parsed.from?.text || "",
                  to: parsed.to?.text || "",
                  cc: parsed.cc?.text || "",
                  // 🔥 Plain text only, cleaned of outliers
                  body: cleanRawBody(parsed.text),
                  // Count attachments without downloading them
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

    imap.once("error", (err) => reject(err));
    imap.once("end", () => resolve(emails));
    imap.connect();
  });
}

module.exports = { fetchEmails };