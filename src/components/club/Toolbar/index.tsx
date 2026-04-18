  'use client';

  import React, { useState, useRef, useEffect } from "react";
  import { IconButton } from "@/components/club/ui/button/Index";
  import { SearchInput } from "@/components/club/ui/search/Index";
  import Select from "@/components/club/ui/select/Index";
  import ShareModal from "../../ShareModal";

  import {
    Printer,
    Database,
    Share2,
    MessageCircleIcon,
    X,
    Calendar,
    Share2Icon
  } from 'lucide-react';

  import dynamic from "next/dynamic";
  const CKEditorComponent = dynamic(() => import("@/components/club/Editor"), {
    ssr: false,
  });


  type ToolbarProps = {
    onPrint: () => void;
    onSearch: (value: string) => void;

    onAgeChange?: (value: string) => void;
    onOperatorChange?: (value: string) => void
    onTypologyChange?: (value: string) => void
    onCasualChange?: (value: string) => void
    onDateRangeChange?: (range: { startDate: string; endDate: string }) => void;
    
    data: string;
  };

  export default function Toolbar({ onPrint, onSearch, data, onAgeChange, onOperatorChange, onTypologyChange, onCasualChange, onDateRangeChange}: ToolbarProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [tableData, setTableData] = useState('');

    const [valueAge, setValueAge] = useState("all");
    const [valueOperator, setValueOperator] = useState("all");
    const [valueTypology, setValueTypology] = useState("all");
    const [valueCasual, setValueCasual] = useState("all");

    const [showMsgDropdown, setShowMsgDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const selectWrapperRef = useRef<HTMLDivElement | null>(null);
    const [selectKey, setSelectKey] = useState(0);

    const [showUserModal, setShowUserModal] = useState(false);
    const [username, setUsername] = useState("");
    const [userMessage, setUserMessage] = useState("");

    const [showEmailModal, setShowEmailModal] = useState(false);
    const [targetEmail, setTargetEmail] = useState("");
    const [emailMessage, setEmailMessage] = useState("");

    const [showDataModal, setShowDataModal] = useState(false);
    const [email, setEmail] = useState("");

    const [showShareModal, setShowShareModal] = useState(false);

    const tableRef = useRef<HTMLTableElement | null>(null);

    /* ✅ DATE RANGE STATE */
    const getToday = () => {
      const today = new Date();
      return today.toISOString().split("T")[0];
    };

    const [dateRange, setDateRange] = useState({
      startDate: "2026-01-01",
      endDate: getToday(),
    });

    const handleDateChange = (
    key: "startDate" | "endDate",
    value: string
  ) => {
    setDateRange((prev) => {
      const updated = { ...prev, [key]: value };

      if (key === "startDate" && value > prev.endDate) {
        updated.endDate = value;
      }
      if (key === "endDate" && value < prev.startDate) {
        updated.startDate = value;
      }

      // ✅ SEND TO TABLE
      onDateRangeChange?.(updated);

      return updated;
    });
  };

    /* ✅ CLOSE DROPDOWNS */
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setShowMsgDropdown(false);
        }

        if (
          selectWrapperRef.current &&
          !selectWrapperRef.current.contains(event.target as Node)
        ) {
          setSelectKey(prev => prev + 1);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const options1 = [
      { label: "All", value: "all" },
      { label: "15 - 20", value: "15-20" },
      { label: "20 - 50", value: "20-50" },
      { label: "50+", value: "50+" }
    ];

    const options2 = [
      { label: "All", value: "all" },
      { label: "Admin", value: "Admin" },
      { label: "Coach", value: "Coach" },
      { label: "Manager", value: "Manager" }
    ];

    const options3 = [
      { label: "All", value: "all" },
      { label: "Premium", value: "Premium" },
      { label: "Standard", value: "Standard" },
      { label: "Basic", value: "Basic" }
    ];

    const options4 = [
      { label: "All", value: "all" },
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
    ];

    /* ================= SEND FUNCTIONS ================= */

    const handleSendToUsername = async () => {
      if (!username || !userMessage) {
        alert("Fill all fields");
        return;
      }
      alert("Message sent to username!");
      setShowUserModal(false);
      setUsername("");
      setUserMessage("");
    };

    const handleSendToEmail = async () => {
      if (!targetEmail || !emailMessage) {
        alert("Fill all fields");
        return;
      }

      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: targetEmail,
            message: emailMessage,
            senderName: "Alexander",   // 👈 dynamic later
            senderEmail: "alex@yourapp.com"
          }),
        });

        const data = await res.json();

        if (data.success) {
          alert("Email sent successfully!");
          setShowEmailModal(false);
          setTargetEmail("");
          setEmailMessage("");
        } else {
          alert("Failed to send email");
        }
      } catch (err) {
        alert("Error sending email");
      }
    };

    const handleSendData = async () => {
      if (!data) return alert("Table not found");
      setTableData(data);
    };

    const handleSendTable = async () => {
      if (!email) return alert("Enter email");
      if (!tableData) return alert("Table not found");

      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            message: "Here is your table data",
            tableHtml: tableData,
          }),
        });

        const result = await res.json();

        if (result.success) {
          alert("Table sent successfully!");
          setShowDataModal(false);
          setEmail("");
        } else {
          alert("Failed to send table");
        }
      } catch (err) {
        alert("Error sending table");
      }
    };

    return (
      <>
        <div className="flex flex-col space-y-2 text-black p-4 bg-white shadow rounded-lg w-full">

          {/* ✅ FILTERS */}
          <div className="flex gap-5 items-center " ref={selectWrapperRef}>
            
            <Select
              key={`age-${selectKey}`}
              label="Age"
              options={options1}
              value={valueAge}
              onChange={(val: string) => {
              setValueAge(val);
              onAgeChange?.(val);
              }}
            />
            <Select
              key={`operator-${selectKey}`}
              label="Operator"
              options={options2}
              value={valueOperator}
              onChange={(val: string) => {
              setValueOperator(val);
              onOperatorChange?.(val); // ✅ SEND TO TABLE
          }}
          />
            <Select
              key={`typology-${selectKey}`}
              label="Typlogy"
              options={options3}
              value={valueTypology}
              onChange={(val: string) => {
              setValueTypology(val);
              onTypologyChange?.(val); // ✅ SEND TO TABLE
          }}
        />
            <Select
              key={`casual-${selectKey}`}
              label="Casual"
              options={options4}
              value={valueCasual}
              onChange={(val: string) => {
              setValueCasual(val);
              onCasualChange?.(val); // ✅ SEND TO TABLE
          }}
        />

            {/* ✅ DATE RANGE PICKER */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Calendar</label>

              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white shadow-sm">
              <input
                type="date"
                value={dateRange.startDate}
                max={dateRange.endDate}
                onChange={(e) => handleDateChange("startDate", e.target.value)}
                className="outline-none text-sm bg-transparent cursor-pointer"
              />

              <span className="text-gray-400">→</span>

              <input
                type="date"
                value={dateRange.endDate}
                min={dateRange.startDate}
                onChange={(e) => handleDateChange("endDate", e.target.value)}
                className="outline-none text-sm bg-transparent cursor-pointer"
              />

              <Calendar size={16} className="text-gray-500" />
            </div>
            </div>
          </div>
          
          {/* ACTION BAR */}
          <div className="flex gap-2 justify-between relative">
            <SearchInput
              placeholder="search...."
              className="w-[30.2vw]"
              onChange={(value) => {
                setSearchTerm(value);
                onSearch(value);
              }}
            />

            <div className="flex gap-2">
              <IconButton icon={<Printer />} label="Print" className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-green-300 hover:bg-green-50 rounded-lg transition-all" onClick={onPrint} />

              {/* DROPDOWN */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowMsgDropdown(!showMsgDropdown)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-green-300 hover:bg-green-50 rounded-lg transition-all"
                >
                  <MessageCircleIcon size={18} />
                  Send Msg
                </button>

                {showMsgDropdown && (
                  <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setShowUserModal(true);
                        setShowMsgDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      To Username
                    </button>

                    <button
                      onClick={() => {
                        setShowEmailModal(true);
                        setShowMsgDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      To Email
                    </button>
                  </div>
                )}
              </div>

              <IconButton
                icon={<Database />}
                label="Send Data"
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-green-300 hover:bg-green-50 rounded-lg transition-all"
                onClick={() => {
                  if (data) setShowDataModal(true);
                  handleSendData();
                }}
              />

              <IconButton
                icon={<Share2 />}
                label="Share"
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-green-300 hover:bg-green-50 rounded-lg transition-all"
                onClick={() => setShowShareModal(true)}
              />
            </div>
          </div>
        </div>

        {/* ================= MODALS (UNCHANGED) ================= */}
        {/* (kept exactly same as your code) */}

        {(showUserModal || showEmailModal) && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white p-6 rounded-2xl w-[95%] max-w-md relative shadow-xl">

              {/* CLOSE */}
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setShowEmailModal(false);
                }}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>

              {/* HEADER */}
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                Send Message
              </h2>

              {/* TOGGLE (Username / Email) */}
              <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setShowUserModal(true);
                    setShowEmailModal(false);
                  }}
                  className={`flex-1 py-2 text-sm rounded-md ${showUserModal ? "bg-white shadow text-black" : "text-gray-500"
                    }`}
                >
                  Username
                </button>

                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setShowEmailModal(true);
                  }}
                  className={`flex-1 py-2 text-sm rounded-md ${showEmailModal ? "bg-white shadow text-black" : "text-gray-500"
                    }`}
                >
                  Email
                </button>
              </div>

              {/* INPUT */}
              {showUserModal ? (
                <input
                  placeholder="Enter username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full mb-3 p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <input
                  placeholder="Enter email..."
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="w-full mb-3 p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}

              {/* MESSAGE */}
              <textarea
                placeholder="Write your message..."
                value={showUserModal ? userMessage : emailMessage}
                onChange={(e) =>
                  showUserModal
                    ? setUserMessage(e.target.value)
                    : setEmailMessage(e.target.value)
                }
                className="w-full mb-4 p-3 border rounded-lg text-gray-900 h-28 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              />

              {/* ACTION */}
              <button
                onClick={() =>
                  showUserModal ? handleSendToUsername() : handleSendToEmail()
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition"
              >
                Send Message
              </button>
            </div>
          </div>
        )}
  {showDataModal && (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      
      {/* MODAL CONTAINER */}
      <div className="bg-white w-[95%] max-w-4xl rounded-2xl shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-lg text-gray-800">
            Send Table Data
          </h2>

          <button
            onClick={() => setShowDataModal(false)}
            className="text-gray-400 hover:text-black transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {/* EMAIL INPUT */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Recipient Email
            </label>
            <input
              placeholder="Enter email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* EDITOR CONTAINER */}
          <div className="border rounded-xl overflow-hidden shadow-sm">

            {/* EDITOR HEADER */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-b">
              <span className="text-xs text-gray-500">
                Rich Text Editor
              </span>
            </div>

            {/* CKEDITOR (OPTIONAL INTERNAL SCROLL) */}
            <div className="p-3 bg-white max-h-[400px] overflow-y-auto">
              <CKEditorComponent
                value={tableData}
                onChange={(value) => setTableData(value)}
                placeholder="Write or edit your table data..."
              />
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => setShowDataModal(false)}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={handleSendTable}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Send Table
          </button>
        </div>

      </div>
    </div>
  )}
        <ShareModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      </>
    );
  }