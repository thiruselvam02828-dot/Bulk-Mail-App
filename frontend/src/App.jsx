import { useState } from "react";
import "./App.css";

const API = "https://bulk-mail-app-krf3.onrender.com/api";

function App() {
  const [page, setPage] = useState("send");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const emailList = recipients
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    if (!subject.trim() || !body.trim() || emailList.length === 0) {
      setResult({ type: "error", text: "Subject, body and at least one email are required" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, recipients: emailList }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", text: data.message });
        setSubject("");
        setBody("");
        setRecipients("");
      } else {
        setResult({ type: "error", text: data.message || "Failed to send" });
      }
    } catch (err) {
      setResult({ type: "error", text: "Cannot reach server. Is the backend running?" });
    }
    setLoading(false);
  };

  const openHistory = async () => {
    setPage("history");
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/history`);
      setHistory(await res.json());
    } catch (err) {
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  return (
    <div className="container">
      <h1>Bulk Mail</h1>

      <div className="tabs">
        <button className={page === "send" ? "tab active" : "tab"} onClick={() => setPage("send")}>
          Send
        </button>
        <button className={page === "history" ? "tab active" : "tab"} onClick={openHistory}>
          History
        </button>
      </div>

      {page === "send" && (
        <>
          <form onSubmit={handleSubmit}>
            <label>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mail subject"
            />

            <label>Message</label>
            <textarea
              rows="6"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your mail here"
            />

            <label>Recipients ({emailList.length})</label>
            <textarea
              rows="4"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="a@gmail.com, b@gmail.com (comma, space or new line)"
            />

            <button type="submit" className="send-btn" disabled={loading}>
              {loading ? "Sending..." : "Send Mail"}
            </button>
          </form>

          {result && <p className={`msg ${result.type}`}>{result.text}</p>}
        </>
      )}

      {page === "history" && (
        <div>
          {historyLoading && <p className="empty">Loading...</p>}
          {!historyLoading && history.length === 0 && <p className="empty">No mails sent yet</p>}
          {history.map((m) => (
            <div className="card" key={m._id}>
              <div className="card-top">
                <strong>{m.subject}</strong>
                <span className={`badge ${m.status}`}>{m.status}</span>
              </div>
              <p className="meta">
                {new Date(m.createdAt).toLocaleString()} | Sent: {m.sentCount} | Failed: {m.failedCount}
              </p>
              <p className="recipients">{m.recipients.join(", ")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;