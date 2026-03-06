import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/train.api";
import { QRCodeSVG } from "qrcode.react";

export default function PaymentGateway() {
    const location = useLocation();
    const navigate = useNavigate();

    const state = location.state;
    const [selectedMethod, setSelectedMethod] = useState("card");
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [failed, setFailed] = useState(false);
    const [showTicket, setShowTicket] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [cardDetails, setCardDetails] = useState({
        number: "",
        name: "",
        expiry: "",
        cvv: "",
    });
    const [upiId, setUpiId] = useState("");
    const [selectedBank, setSelectedBank] = useState("");

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Warn before reload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "Your data will be lost.";
            return e.returnValue;
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    // Intercept browser back button
    useEffect(() => {
        window.history.pushState(null, "", window.location.href);
        let isLeaving = false;

        const handlePopState = () => {
            if (isLeaving) return; // Prevent double trigger when we manually go back

            if (window.confirm("Are you sure you want to go back? Your payment session will be lost.")) {
                isLeaving = true;
                window.history.back(); // Jump back over the original entry
            } else {
                window.history.pushState(null, "", window.location.href); // Stay on page
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    if (!state) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
                <div className="text-center max-w-md px-6">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-white mb-3">Session Expired</h1>
                    <p className="text-gray-400 mb-6">Your payment session was lost. Please start the booking again.</p>
                    <button onClick={() => navigate("/")} className="px-6 py-3 rounded-xl font-bold text-gray-900" style={{ backgroundColor: '#e2e8f0' }}>
                        ← Back to Search
                    </button>
                </div>
            </div>
        );
    }

    const isUnreserved = state.isUnreserved || false;
    const trainName = isUnreserved ? state.train.trainName : state.trainName;
    const trainNumber = isUnreserved ? state.train.trainNumber : state.trainNumber;
    const classType = state.classType;
    const journeyDate = state.journeyDate;
    const passengerCount = state.passengerCount;

    // Calculate unreserved fares dynamically, or just grab the payload params
    const baseFare = isUnreserved ? state.farePerPassenger : 500;
    const ticketFareTotal = passengerCount * baseFare;
    const serviceCharge = 20;
    const gstTotal = Math.round(ticketFareTotal * 0.05);
    const totalAmount = isUnreserved ? (ticketFareTotal + serviceCharge + gstTotal) : state.totalAmount;

    const payload = isUnreserved ? {
        trainNumber,
        journeyDate,
        source: state.source,
        destination: state.destination,
        passengerCount,
        totalFare: totalAmount
    } : state.payload;

    const handleCardChange = (field, value) => {
        if (field === "number") {
            value = value.replace(/\D/g, "").slice(0, 16);
            value = value.replace(/(.{4})/g, "$1 ").trim();
        }
        if (field === "expiry") {
            value = value.replace(/\D/g, "").slice(0, 4);
            if (value.length > 2) value = value.slice(0, 2) + "/" + value.slice(2);
        }
        if (field === "cvv") value = value.replace(/\D/g, "").slice(0, 3);
        setCardDetails({ ...cardDetails, [field]: value });
    };

    const handlePay = async () => {
        setProcessing(true);

        // Processing waits 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Simulate 30% chance of payment failure, or forced failure if name is 'fail'
        const isFailure = Math.random() < 0.3 || (selectedMethod === 'card' && cardDetails.name.toLowerCase().includes('fail'));

        if (isFailure) {
            setProcessing(false);
            setFailed(true);
            return;
        }

        try {
            let result;
            if (isUnreserved) {
                const unreservedRes = await api.bookUnreserved(payload);
                // Create a fallback PNR ID for the UI using the database UUID
                result = { pnr: 'UR-' + unreservedRes.ticket.id.split('-')[0].toUpperCase(), ...unreservedRes.ticket };
            } else {
                result = await api.createBooking(payload);
            }
            setBookingResult(result);
            setProcessing(false);
            setSuccess(true);

            // Wait for the background animation to expand before fading in the ticket card
            setTimeout(() => {
                setShowTicket(true);
            }, 700);
        } catch (err) {
            setProcessing(false);
            alert("Payment failed: " + (err.message || "Unknown error"));
        }
    };

    const isFormValid = () => {
        if (selectedMethod === "card") {
            return cardDetails.number.length >= 16 &&
                cardDetails.name.length > 2 &&
                cardDetails.expiry.length === 5 &&
                cardDetails.cvv.length === 3;
        }
        if (selectedMethod === "upi") {
            // Check if it's a loosely valid UPI ID (e.g., name@bank)
            return upiId.length > 3 && upiId.includes('@');
        }
        if (selectedMethod === "netbanking") {
            return selectedBank !== "";
        }
        return false;
    };

    // Failure Screen
    if (failed) {
        return (
            <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                <style>
                    {`
                        @keyframes popIn {
                            0% { transform: scale(0); opacity: 0; }
                            70% { transform: scale(1.1); }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        .fail-icon {
                            animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                        }
                    `}
                </style>
                <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl mb-6 bg-red-500 fail-icon z-20">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <h1 className="text-3xl font-bold text-white mb-3 z-20">Payment Failed</h1>
                <p className="text-gray-400 text-center max-w-md mb-8 px-6 z-20">
                    Your transaction could not be completed at this time due to a bank timeout or network issue.
                    <br /><br />
                    <span className="text-orange-400 font-medium">If money has been deducted from your account, it will be automatically refunded within 3-5 business days.</span>
                </p>

                <div className="flex gap-4 z-20 flex-col sm:flex-row w-full max-w-xs sm:max-w-md px-6">
                    <button
                        onClick={() => {
                            setFailed(false);
                            setProcessing(false);
                        }}
                        className="bg-transparent border border-red-500 text-red-400 font-bold py-3 px-8 rounded-xl hover:bg-red-500/10 transition duration-300 w-full"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="bg-gray-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-gray-600 transition duration-300 w-full"
                    >
                        Cancel Booking
                    </button>
                </div>
            </div>
        );
    }

    // Success Screen
    if (success) {
        return (
            <div className="min-h-screen relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                <style>
                    {`
                        @keyframes expandBg {
                            0% { transform: scale(1); opacity: 1; border-radius: 50%; }
                            100% { transform: scale(30); opacity: 1; border-radius: 50%; }
                        }
                        .bg-wave {
                            animation: expandBg 0.8s ease-in-out forwards;
                            position: absolute;
                            width: 100px;
                            height: 100px;
                            background-color: #4ab86d;
                            z-index: 10;
                        }
                        @keyframes fadeUp {
                            0% { opacity: 0; transform: translateY(20px) scale(0.95); }
                            100% { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        .ticket-fade {
                            animation: fadeUp 0.6s ease-out forwards;
                            animation-delay: 0.1s;
                            opacity: 0;
                            z-index: 20;
                            position: relative;
                        }
                        .check-icon {
                            z-index: 30;
                            position: relative;
                            animation: checkPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                        }
                        @keyframes checkPop {
                            0% { transform: scale(0); opacity: 0; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                    `}
                </style>

                {/* Expanding green background */}
                <div className="bg-wave flex items-center justify-center"></div>

                {/* The tick mark stays in the center initially */}
                {!showTicket && (
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl check-icon" style={{ backgroundColor: '#4ab86d' }}>
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Ticket and details (fades in after expansion) */}
                {showTicket && (
                    <div className="max-w-md w-full px-4 pt-8 ticket-fade z-20">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-white shadow-xl">
                                <svg className="w-8 h-8" style={{ color: '#4ab86d' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2 shadow-sm drop-shadow-md">Payment Successful!</h1>
                            <p className="text-white/90 text-sm font-medium mb-2">Your ticket has been generated securely.</p>
                        </div>

                        {/* Ticket Card */}
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative">
                            {/* Ticket header */}
                            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                                <div>
                                    <h3 className="text-gray-900 font-bold text-lg">{trainName}</h3>
                                    <p className="text-gray-500 text-xs font-mono">#{trainNumber}</p>
                                </div>
                                <div className="text-right">
                                    <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase">Confirmed</span>
                                </div>
                            </div>

                            {/* Ticket details */}
                            <div className="px-6 py-5">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">PNR No.</p>
                                        <p className="font-bold text-gray-900 font-mono text-lg">{bookingResult?.pnr}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Journey Date</p>
                                        <p className="font-bold text-gray-900">{new Date(journeyDate).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Class</p>
                                        <p className="font-bold text-gray-900">{classType}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Passengers</p>
                                        <p className="font-bold text-gray-900">{passengerCount}</p>
                                    </div>
                                </div>

                                {/* Dashed line */}
                                <div className="w-full border-t-2 border-dashed border-gray-300 my-4 relative">
                                    <div className="absolute -left-9 -top-3 w-6 h-6 rounded-full" style={{ backgroundColor: '#4ab86d' }}></div>
                                    <div className="absolute -right-9 -top-3 w-6 h-6 rounded-full" style={{ backgroundColor: '#4ab86d' }}></div>
                                </div>

                                {/* QR Code Section */}
                                <div className="flex flex-col items-center justify-center py-4">
                                    <div className="p-3 bg-white border-2 border-gray-100 rounded-xl shadow-sm mb-3">
                                        <QRCodeSVG
                                            value={JSON.stringify({
                                                pnr: bookingResult?.pnr,
                                                train: trainNumber,
                                                date: journeyDate,
                                                passengers: passengerCount,
                                                verified: true
                                            })}
                                            size={120}
                                            level="L"
                                            includeMargin={false}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-mono text-center max-w-[200px]">Scan securely by TTE for digital verification</p>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-8 flex gap-4 justify-center pb-8">
                            <button
                                onClick={() => navigate("/pnr-status", { state: { pnr: bookingResult?.pnr, justBooked: true } })}
                                className="bg-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-300 w-full"
                                style={{ color: '#4ab86d' }}
                            >
                                View Live PNR Status
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Processing Overlay
    if (processing) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-700 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-xl font-bold text-white mb-2">Processing Payment</h2>
                    <p className="text-gray-400">Please do not close this window...</p>
                </div>
            </div>
        );
    }

    const paymentMethods = [
        { id: "card", label: "Credit/Debit Card", icon: "💳" },
        { id: "upi", label: "UPI", icon: "📱" },
        { id: "netbanking", label: "Net Banking", icon: "🏦" },
    ];

    return (
        <div className="min-h-screen pt-[78px] pb-20 px-4 font-sans text-gray-100 relative" style={{ backgroundColor: '#0f172a' }}>
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="text-center mb-6 mt-[-2px]">
                    <h1 className="text-5xl font-bold text-white">Confirm Payment</h1>
                </div>

                {/* Warning Banner */}
                <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                    <p className="text-xs md:text-sm text-red-400 font-medium flex items-center justify-center gap-2">
                        <span>⚠️</span> Do not close or refresh this page. Your session will be lost.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* Payment Form */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Payment Method Selection */}
                        <div className="rounded-2xl p-6 border border-white/5" style={{ backgroundColor: '#2B2B2B' }}>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Select Payment Method</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {paymentMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setSelectedMethod(method.id)}
                                        className={`p-4 rounded-xl text-center transition-all duration-200 border ${selectedMethod === method.id
                                            ? "border-white/20 text-white"
                                            : "border-transparent text-gray-400 hover:text-white"
                                            }`}
                                        style={{ backgroundColor: selectedMethod === method.id ? '#383838' : 'transparent' }}
                                    >
                                        <div className="text-2xl mb-2">{method.icon}</div>
                                        <div className="text-xs font-medium">{method.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card Details Form */}
                        {selectedMethod === "card" && (
                            <div className="rounded-2xl p-6 border border-white/5" style={{ backgroundColor: '#2B2B2B' }}>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Card Details</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 ml-1">Card Number</label>
                                        <input
                                            type="text"
                                            placeholder="1234 5678 9012 3456"
                                            value={cardDetails.number}
                                            onChange={(e) => handleCardChange("number", e.target.value)}
                                            className="w-full rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:border-gray-400 text-white placeholder-gray-600 font-mono tracking-wider"
                                            style={{ backgroundColor: '#1a1a1a' }}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 ml-1">Cardholder Name</label>
                                        <input
                                            type="text"
                                            placeholder="Name on card"
                                            value={cardDetails.name}
                                            onChange={(e) => handleCardChange("name", e.target.value)}
                                            className="w-full rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:border-gray-400 text-white placeholder-gray-600"
                                            style={{ backgroundColor: '#1a1a1a' }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400 ml-1">Expiry</label>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                value={cardDetails.expiry}
                                                onChange={(e) => handleCardChange("expiry", e.target.value)}
                                                className="w-full rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:border-gray-400 text-white placeholder-gray-600 font-mono"
                                                style={{ backgroundColor: '#1a1a1a' }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400 ml-1">CVV</label>
                                            <input
                                                type="password"
                                                placeholder="•••"
                                                value={cardDetails.cvv}
                                                onChange={(e) => handleCardChange("cvv", e.target.value)}
                                                className="w-full rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:border-gray-400 text-white placeholder-gray-600 font-mono"
                                                style={{ backgroundColor: '#1a1a1a' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* UPI */}
                        {selectedMethod === "upi" && (
                            <div className="rounded-2xl p-6 border border-white/5" style={{ backgroundColor: '#2B2B2B' }}>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">UPI Payment</h3>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 ml-1">UPI ID</label>
                                    <input
                                        type="text"
                                        placeholder="yourname@upi"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        className="w-full rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:border-gray-400 text-white placeholder-gray-600"
                                        style={{ backgroundColor: '#1a1a1a' }}
                                    />
                                </div>
                                <div className="mt-4 flex items-center gap-4 text-gray-500 text-xs">
                                    <span className="px-3 py-1 rounded-full border border-gray-600">GPay</span>
                                    <span className="px-3 py-1 rounded-full border border-gray-600">PhonePe</span>
                                    <span className="px-3 py-1 rounded-full border border-gray-600">Paytm</span>
                                </div>
                            </div>
                        )}

                        {/* Net Banking */}
                        {selectedMethod === "netbanking" && (
                            <div className="rounded-2xl p-6 border border-white/5" style={{ backgroundColor: '#2B2B2B' }}>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Select Bank</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {["SBI", "HDFC", "ICICI", "Axis", "PNB", "BOB"].map((bank) => (
                                        <button
                                            key={bank}
                                            onClick={() => setSelectedBank(bank)}
                                            className={`p-3 rounded-lg text-sm transition-all border ${selectedBank === bank
                                                ? "border-green-500 text-white"
                                                : "text-gray-300 border-gray-600 hover:border-gray-400 hover:text-white"
                                                }`}
                                            style={{ backgroundColor: selectedBank === bank ? '#1a3320' : '#1a1a1a' }}
                                        >
                                            {bank} Bank
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-2">
                        <div className="rounded-2xl p-6 border border-white/5 sticky top-24" style={{ backgroundColor: '#2B2B2B' }}>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Order Summary</h3>

                            <div className="space-y-3 mb-6">
                                <div className="text-white font-bold">{trainName}</div>
                                <div className="text-xs text-gray-400">Train #{trainNumber}</div>

                                <div className="h-px bg-gray-700"></div>

                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Class</span>
                                    <span className="text-white">{classType}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Date</span>
                                    <span className="text-white">{new Date(journeyDate).toDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Passengers</span>
                                    <span className="text-white">{passengerCount}</span>
                                </div>

                                <div className="h-px bg-gray-700"></div>

                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Ticket Fare (x{passengerCount})</span>
                                    <span>₹{ticketFareTotal}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Service Charge</span>
                                    <span>₹{serviceCharge}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>GST (5%)</span>
                                    <span>₹{gstTotal}</span>
                                </div>

                                <div className="h-px bg-gray-700"></div>

                                <div className="flex justify-between font-bold text-white text-lg">
                                    <span>Total</span>
                                    <span>₹{totalAmount}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePay}
                                disabled={!isFormValid()}
                                className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition duration-300 flex justify-center items-center gap-2 text-lg ${!isFormValid() ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={{ backgroundColor: !isFormValid() ? '#4b5563' : '#4ab86d' }}
                            >
                                Pay ₹{totalAmount}
                            </button>

                            <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 text-xs">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span>Secured by SmartRail Pay</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
