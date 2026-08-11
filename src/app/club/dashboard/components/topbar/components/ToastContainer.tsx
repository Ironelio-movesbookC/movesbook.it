"use client";

import { ToastType } from "../types";


type ToastContainerProps = {
    toasts: ToastType[];
    onRemove: (id: number) => void;
};


export default function ToastContainer({
    toasts,
    onRemove
}: ToastContainerProps) {


    return (
        <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">
            {toasts.map((toast) => (
                <div key={toast.id} className={`min-w-[300px] max-w-sm rounded-lg border p-4 shadow-lg transform transition-all duration-300 ease-in-out ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : toast.type === "info" ? "bg-blue-50 border-blue-200 text-blue-800" : toast.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                    <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-0.5 ${toast.type === "success" ? "text-green-500" : toast.type === "info" ? "text-blue-500" : toast.type === "warning" ? "text-yellow-500" : "text-red-500"}`}>
                            {toast.type === "success" && "✓"}
                            {toast.type === "info" && "ℹ"}
                            {toast.type === "warning" && "⚠"}
                            {toast.type === "error" && "✗"}
                        </div>

                        <div className="flex-1">
                            <p className="text-sm font-medium">
                                {toast.message}
                            </p>
                        </div>

                        <button onClick={() => onRemove(toast.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}