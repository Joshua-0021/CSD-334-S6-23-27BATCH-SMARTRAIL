import { useState, useEffect } from "react";
import { Upload, X, FileText, Image as ImageIcon, CheckCircle2, History, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { supabase, getCurrentUser } from "../utils/supabaseClient";

export default function Support({ autoScroll = true }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [complaintName, setComplaintName] = useState("");
  const [description, setDescription] = useState("");

  const [user, setUser] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("idle"); // idle, uploading, submitting, success, error
  const [errorMessage, setErrorMessage] = useState("");

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Reply State
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [markResolved, setMarkResolved] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => {
    // Custom wrapper to set user safely
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (showHistory && user) {
      fetchHistory();
    }
  }, [showHistory, user]);

  // Fetch replies when a complaint is selected
  useEffect(() => {
    const fetchReplies = async () => {
      if (!selectedComplaint) {
        setReplies([]);
        setReplyText("");
        setMarkResolved(false);
        return;
      }

      setLoadingReplies(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No session found');
          setLoadingReplies(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/${selectedComplaint.id}/replies`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setReplies(data.replies || []);
        } else {
          console.error('Failed to fetch replies');
          setReplies([]);
        }
      } catch (error) {
        console.error('Error fetching replies:', error);
        setReplies([]);
      } finally {
        setLoadingReplies(false);
      }
    };

    fetchReplies();
  }, [selectedComplaint]);

  useEffect(() => {
    const handlePopState = () => {
      // If back button is pressed while modal/confirm is open, close them
      if (selectedComplaint) {
        setSelectedComplaint(null);
        setConfirmDeleteId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedComplaint]);

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p));
  }, [previews]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const updatedFiles = [...files, ...selected].slice(0, 5);
    setFiles(updatedFiles);

    const p = updatedFiles.map((f) => URL.createObjectURL(f));
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews(p);
  };

  const handleRemove = (idx) => {
    const newFiles = files.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    URL.revokeObjectURL(previews[idx]);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const uploadImages = async (userId) => {
    const uploadedUrls = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('support-evidence')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('support-evidence')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !selectedComplaint) return;

    setSubmittingReply(true);
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Please log in to send a reply');
        setTimeout(() => setErrorMessage(''), 3000);
        setSubmittingReply(false);
        return;
      }

      // Use the backend API which has supabaseAdmin (bypasses RLS)
      const response = await fetch(`http://localhost:5000/api/complaints/${selectedComplaint.id}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: replyText.trim(),
          marks_resolved: markResolved
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Reply error:', data);
        setErrorMessage(`Failed to send: ${data.error}${data.details ? ' — ' + data.details : ''}`);
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }

      // Add new reply to the list
      setReplies(prev => [...prev, data.reply]);
      setReplyText("");

      // If marked as resolved, update local state immediately
      if (markResolved) {
        setSelectedComplaint(prev => ({ ...prev, status: 'resolved' }));
        setHistory(prev => prev.map(item =>
          item.id === selectedComplaint.id
            ? { ...item, status: 'resolved' }
            : item
        ));
        setMarkResolved(false);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      setErrorMessage('Failed to send reply. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async (id, images = []) => {
    try {
      // 1. Delete images from storage if they exist
      if (images && images.length > 0) {
        const filePaths = images.map(url => {
          // Extract path after 'support-evidence/'
          // URL format: .../storage/v1/object/public/support-evidence/USER_ID/FILENAME
          const parts = url.split('support-evidence/');
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean);

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('support-evidence')
            .remove(filePaths);

          if (storageError) console.error("Error deleting files:", storageError);
        }
      }

      // 2. Delete DB record
      const { error } = await supabase.from('complaints').delete().eq('id', id);
      if (error) throw error;

      // Update local state
      setHistory(prev => prev.filter(item => item.id !== id));
      // Update local state
      // Update local state
      setHistory(prev => prev.filter(item => item.id !== id));
      setConfirmDeleteId(null);
      // Close modal by going back in history (pops the modal state)
      window.history.back();
    } catch (err) {
      console.error("Error deleting complaint:", err);
      // Optional: Show error toast/message
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setErrorMessage("You must be logged in to submit.");
      setSubmissionStatus("error");
      return;
    }
    if (!complaintName || !description) {
      setErrorMessage("Please fill in all fields.");
      setSubmissionStatus("error");
      return;
    }

    try {
      setSubmissionStatus("uploading");
      setErrorMessage("");

      const imageUrls = await uploadImages(user.id);

      setSubmissionStatus("submitting");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication session expired.");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject: complaintName,
          description,
          images: imageUrls
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to submit complaint.");
      }

      setSubmissionStatus("success");
      setComplaintName("");
      setDescription("");
      setFiles([]);
      setPreviews([]);

      // Refresh history if open
      if (showHistory) fetchHistory();

      setTimeout(() => setSubmissionStatus("idle"), 3000);

    } catch (err) {
      console.error(err);
      setSubmissionStatus("error");
      setErrorMessage(err.message || "Failed to submit complaint.");
    }
  };

  // Optionally scroll to the support heading when this route mounts so heading isn't hidden
  // behind the fixed header. When embedded in the homepage we set `autoScroll={false}`.
  useEffect(() => {
    // Check for reload navigation to prevent unwanted scrolling
    const isReload = (
      (window.performance &&
        window.performance.getEntriesByType &&
        window.performance.getEntriesByType('navigation')[0]?.type === 'reload') ||
      (window.performance && window.performance.navigation && window.performance.navigation.type === 1)
    );

    // If reloading, let the App.jsx handler redirect to home instead of scrolling here
    if (isReload) return;

    if (!autoScroll) return;
    const el = document.getElementById("support-section");
    if (el) {
      // Use a small timeout to allow router/layout to settle
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [autoScroll]);

  return (
    <div id="support-section" className="relative w-full max-w-6xl mx-auto mt-16 px-4 pb-20 text-white animate-in fade-in duration-700 scroll-mt-[120px]">
      <div className="mb-10 border-b border-[#B3B3B3]/20 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-0">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-[#FFFFFF]">Support</h2>
          <p className="text-[#D4D4D4] opacity-60 text-sm md:text-base font-medium leading-relaxed mt-1">
            File a complaint or report an issue
          </p>
        </div>

        {user && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${showHistory ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <History className="w-3 h-3" />
            {showHistory ? "Hide History" : "My Complaints"}
          </button>
        )}
      </div>

      {/* HISTORY PANEL */}
      {showHistory && (
        <div className="mb-10 bg-transparent rounded-2xl border-2 border-dashed border-[#B3B3B3]/30 p-6 animate-in slide-in-from-top-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#666] mb-4">Past Complaints</h3>

          {loadingHistory ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-white animate-spin" /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No complaints found.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    window.history.pushState({ modal: 'open' }, '');
                    setSelectedComplaint(item);
                  }}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-transparent rounded-xl border border-dashed border-[#B3B3B3]/30 hover:bg-white/5 transition-colors cursor-pointer group/item"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`w-2 h-2 rounded-full ${item.status === 'resolved' ? 'bg-green-500' :
                        item.status === 'in_progress' ? 'bg-blue-500' :
                          item.status === 'closed' ? 'bg-gray-500' : 'bg-yellow-500'
                        }`} />
                      <span className="text-sm font-bold text-white uppercase">{item.subject}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 uppercase">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-md border ${item.status === 'resolved' ? 'border-green-500/30 text-green-500' :
                      item.status === 'in_progress' ? 'border-blue-500/30 text-blue-500' :
                        item.status === 'closed' ? 'border-gray-500/30 text-gray-500' : 'border-yellow-500/30 text-yellow-500'
                      }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Container - Weighted 1.5px Border */}
      <div className="border-[1.5px] border-[#B3B3B3] rounded-2xl md:rounded-[28px] overflow-hidden bg-transparent flex flex-col md:flex-row">

        {/* PARTITION 1: UPLOADS & FILENAMES */}
        <div className="flex-1 p-6 md:p-8 border-b-[1.5px] md:border-b-0 md:border-r-[1.5px] border-dashed border-[#B3B3B3]/30 bg-white/5">
          <div className="flex items-center gap-3 mb-8">
            <Upload className="w-5 h-5 text-[#B3B3B3]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4D4D4]">Evidence Upload</span>
          </div>

          <label className="group relative flex flex-col items-center justify-center w-full h-44 border-[1.5px] border-dashed border-[#B3B3B3]/40 rounded-2xl cursor-pointer hover:bg-[#2B2B2B] transition-all mb-8">
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="p-3 bg-white/5 rounded-full mb-3">
                <ImageIcon className="w-6 h-6 text-[#FFFFFF]" />
              </div>
              <p className="text-[10px] font-black text-[#FFFFFF] uppercase tracking-widest">Select Images</p>
              <p className="text-[9px] text-[#D4D4D4]/50 mt-1 uppercase tracking-tighter">Attach up to 5 files</p>
            </div>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} disabled={files.length >= 5} />
          </label>

          {/* LIST OF 5 FILENAMES */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Upload Queue ({files.length}/5)</span>
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-[#B3B3B3]/10 rounded-xl bg-[#2B2B2B]/40 transition-all">
                <div className="flex items-center gap-3 truncate">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#B3B3B3]/20 flex-shrink-0">
                    <img src={previews[idx]} className="w-full h-full object-cover" alt="thumb" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-black text-[#FFFFFF] truncate uppercase tracking-tighter">{file.name}</p>
                    <p className="text-[8px] text-gray-500 font-mono italic">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(idx)} className="p-1.5 hover:bg-red-500/10 rounded-full transition-colors">
                  <X className="w-4 h-4 text-red-500/50 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PARTITION 2: DETAILS */}
        <div className="flex-[1.4] p-6 md:p-8 space-y-8">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#B3B3B3]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4D4D4]">Complaint Details</span>
          </div>

          <div className="space-y-6">
            <div className="group">
              <label className="text-[9px] font-bold text-[#B3B3B3] uppercase tracking-widest block mb-2 transition-colors group-focus-within:text-white">Subject</label>
              <input
                type="text"
                value={complaintName}
                onChange={(e) => setComplaintName(e.target.value)}
                placeholder="E.G. DELAYED REFUND / SEAT ISSUE"
                className="w-full bg-transparent border-b-[1.5px] border-[#B3B3B3]/30 p-3 text-sm focus:border-white transition-colors outline-none font-black uppercase tracking-wider text-[#FFFFFF]"
              />
            </div>

            <div className="group">
              <label className="text-[9px] font-bold text-[#B3B3B3] uppercase tracking-widest block mb-2 transition-colors group-focus-within:text-white">Description</label>
              <textarea
                rows={9}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem, where it happened, train/PNR if applicable..."
                className="w-full bg-[#FFFFFF]/5 border-[1.5px] border-dashed border-[#B3B3B3]/20 p-5 text-xs focus:border-[#B3B3B3]/60 transition-colors outline-none resize-none rounded-2xl font-mono leading-relaxed text-[#FFFFFF]"
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row justify-end items-center gap-4 md:gap-8">
            {/* Status Messages */}
            {submissionStatus === 'success' && (
              <span className="text-green-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Submitted Successfully
              </span>
            )}
            {submissionStatus === 'error' && (
              <span className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {errorMessage || "Error submitting"}
              </span>
            )}

            <div className="flex items-center gap-8">
              <button
                onClick={() => { setComplaintName(""); setDescription(""); setFiles([]); setPreviews([]); }}
                className="text-[10px] font-black uppercase text-[#D4D4D4] border-b-[1.5px] border-[#FFFFFF] pb-0.5 hover:text-white transition-all tracking-widest disabled:opacity-50"
                disabled={submissionStatus === 'submitting' || submissionStatus === 'uploading'}
              >
                Clear
              </button>
              <button
                onClick={handleSubmit}
                disabled={submissionStatus === 'submitting' || submissionStatus === 'uploading'}
                className="flex items-center gap-3 px-12 py-4 bg-white text-black text-[10px] font-black uppercase rounded-full hover:bg-[#D4D4D4] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submissionStatus === 'uploading' ? 'Uploading...' :
                  submissionStatus === 'submitting' ? 'Submitting...' :
                    'Submit Complaint'}
                {submissionStatus === 'submitting' || submissionStatus === 'uploading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(179, 179, 179, 0.2); border-radius: 10px; }
      `}</style>

      {/* DETAIL MODAL */}
      {
        selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-6 border-b border-[#333] flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-2 h-2 rounded-full ${selectedComplaint.status === 'resolved' ? 'bg-green-500' :
                      selectedComplaint.status === 'in_progress' ? 'bg-blue-500' :
                        selectedComplaint.status === 'closed' ? 'bg-gray-500' : 'bg-yellow-500'
                      }`} />
                    <h3 className="text-xl font-black uppercase text-white tracking-tight">{selectedComplaint.subject}</h3>
                  </div>
                  <p className="text-[10px] font-mono text-gray-500 uppercase">{new Date(selectedComplaint.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => window.history.back()}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar max-h-[60vh]">
                <div className="mb-8">
                  <h4 className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3">Description</h4>
                  <p className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{selectedComplaint.description}</p>
                </div>

                {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3">Evidence</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedComplaint.images.map((imgUrl, idx) => (
                        <a
                          key={idx}
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square rounded-lg overflow-hidden border border-[#333] bg-black/20 hover:border-white/30 transition-colors group"
                        >
                          <img src={imgUrl} alt="evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Replies Section */}
                <div>
                  <h4 className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span>Discussion Thread</span>
                    <span className="text-[8px] bg-white/10 px-2 py-0.5 rounded-full">{replies.length}</span>
                  </h4>

                  {/* Reply List - Chat Style */}
                  <div className="space-y-4 mb-6 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                    {loadingReplies ? (
                      // Skeleton Loading for Chat
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'} animate-pulse`}>
                            <div className="w-8 h-8 rounded-full bg-white/5" />
                            <div className={`flex flex-col ${i % 2 === 0 ? 'items-start' : 'items-end'} w-full`}>
                              <div className={`h-3 w-20 bg-white/5 rounded mb-2 ${i % 2 === 0 ? 'self-start' : 'self-end'}`} />
                              <div className={`h-12 w-[60%] bg-white/5 rounded-2xl ${i % 2 === 0 ? 'rounded-tl-sm' : 'rounded-tr-sm'}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : replies.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-gray-500 italic">No messages yet. Start the conversation below.</p>
                      </div>
                    ) : (
                      replies.map(reply => (
                        <div
                          key={reply.id}
                          className={`flex gap-3 ${reply.is_admin_reply ? 'flex-row' : 'flex-row-reverse'} animate-in slide-in-from-bottom-2 duration-300`}
                        >
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${reply.is_admin_reply
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-white/10 text-gray-400'
                            }`}>
                            {reply.is_admin_reply ? '🛡️' : '👤'}
                          </div>

                          {/* Message Bubble */}
                          <div className={`flex flex-col ${reply.is_admin_reply ? 'items-start' : 'items-end'} max-w-[75%]`}>
                            {/* Name and Time */}
                            <div className={`flex items-center gap-2 mb-1 ${reply.is_admin_reply ? 'flex-row' : 'flex-row-reverse'}`}>
                              <span className="text-[10px] font-bold text-white">
                                {reply.is_admin_reply ? 'Support Team' : 'You'}
                              </span>
                              <span className="text-[9px] text-gray-500 font-mono">
                                {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Bubble */}
                            <div className={`rounded-2xl px-4 py-3 ${reply.is_admin_reply
                              ? 'bg-blue-500/20 rounded-tl-sm'
                              : 'bg-white/5 rounded-tr-sm'
                              }`}>
                              <p className="text-sm text-gray-200 leading-relaxed">{reply.message}</p>
                            </div>

                            {/* Resolved Badge */}
                            {reply.marks_resolved && (
                              <div className="mt-2 px-3 py-1 bg-green-500/20 text-green-400 text-[9px] font-bold uppercase rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Issue Resolved
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="text-sm text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Reply Input - only if not closed or resolved */}
                  {selectedComplaint.status !== 'closed' && selectedComplaint.status !== 'resolved' && (
                    <div className="space-y-3 border-t border-[#333] pt-6">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Add a follow-up message or provide more details..."
                        className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none transition-colors resize-none"
                        rows={3}
                      />
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                            <input
                              type="checkbox"
                              checked={markResolved}
                              onChange={(e) => setMarkResolved(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 bg-[#2a2a2a] text-green-500 focus:ring-green-500/20"
                            />
                            Mark this issue as resolved
                          </label>
                          <button
                            onClick={handleSubmitReply}
                            disabled={!replyText.trim() || submittingReply}
                            className="px-6 py-2.5 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {submittingReply ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Send Reply'
                            )}
                          </button>
                        </div>
                        {markResolved && (
                          <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <CheckCircle2 className="w-3 h-3" />
                            This reply will mark the complaint as resolved
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {(selectedComplaint.status === 'resolved' || selectedComplaint.status === 'closed') && (
                    <div className="border-t border-[#333] pt-4 text-center">
                      <p className="text-xs text-gray-500 italic">This complaint has been {selectedComplaint.status}. No further replies can be added.</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Modal Footer - Actions */}
              {selectedComplaint.status === 'open' && (
                <div className="p-6 border-t border-[#333] flex justify-end bg-black/40">
                  {confirmDeleteId === selectedComplaint.id ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300 w-full sm:w-auto">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-widest hidden sm:inline">Are you sure?</span>
                      <div className="flex gap-4 w-full sm:w-auto">
                        <button
                          onClick={() => handleDelete(selectedComplaint.id, selectedComplaint.images)}
                          className="flex-1 sm:flex-none px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 whitespace-nowrap"
                        >
                          Yes, Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 sm:flex-none px-6 py-2 bg-[#333] text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#444] transition-colors whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(selectedComplaint.id)}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-300 group"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Complaint
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
}