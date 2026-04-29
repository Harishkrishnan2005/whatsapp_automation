import { useEffect, useState } from 'react';
import { FiLifeBuoy, FiSend } from 'react-icons/fi';
import api from '../../utils/api';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

const StaffTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');

  const fetchTickets = async () => {
    const response = await api.get('/support');
    const rows = Array.isArray(response.data) ? response.data : [];
    setTickets(rows);

    if (selectedTicket) {
      setSelectedTicket(rows.find((ticket) => ticket._id === selectedTicket._id) || null);
    }
  };

  useEffect(() => {
    fetchTickets().catch((error) => console.error('Failed to fetch tickets', error));
  }, []);

  const updateStatus = async (status) => {
    if (!selectedTicket) return;
    await api.put(`/support/${selectedTicket._id}/status`, { status });
    await fetchTickets();
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    await api.post(`/support/${selectedTicket._id}/reply`, { message: reply });
    setReply('');
    await fetchTickets();
  };

  return (
    <div className="grid h-[calc(100vh-140px)] grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h1 className="text-2xl font-black text-slate-900">Assigned Tickets</h1>
        </div>
        <div className="space-y-3 overflow-y-auto p-4">
          {tickets.map((ticket) => (
            <button
              key={ticket._id}
              onClick={() => setSelectedTicket(ticket)}
              className={`w-full rounded-[1.5rem] border p-4 text-left transition ${selectedTicket?._id === ticket._id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50 hover:bg-white'}`}
            >
              <p className="text-sm font-black uppercase">{ticket.subject}</p>
              <p className={`mt-2 text-[10px] font-black uppercase tracking-widest ${selectedTicket?._id === ticket._id ? 'text-slate-300' : 'text-slate-400'}`}>
                {ticket.customerId?.name || 'Customer'} • {ticket.status}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-sm">
        {!selectedTicket ? (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
            <FiLifeBuoy className="mb-4 h-12 w-12" />
            <p className="text-sm font-black uppercase tracking-[0.2em]">Select a ticket</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{selectedTicket.subject}</h2>
                <p className="mt-1 text-xs font-bold text-slate-400">{selectedTicket.customerId?.name} • {selectedTicket.customerId?.phone}</p>
              </div>
              <div className="flex gap-2">
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(status)}
                    className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${selectedTicket.status === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/40 p-8">
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Original request</p>
                <p className="mt-2 text-sm text-slate-700">{selectedTicket.message}</p>
              </div>
              {(selectedTicket.replies || []).map((item, index) => (
                <div key={`${item.timestamp}-${index}`} className={`flex ${item.sender === 'staff' || item.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-[1.5rem] px-5 py-4 ${item.sender === 'staff' || item.sender === 'admin' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
                    <p className="text-sm">{item.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-6">
              <div className="flex gap-3">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Reply to the customer"
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium outline-none"
                />
                <button onClick={sendReply} className="rounded-2xl bg-blue-600 px-5 text-white">
                  <FiSend className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default StaffTickets;
