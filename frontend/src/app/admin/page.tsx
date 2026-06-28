"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ShieldAlert, RefreshCw, Package, CheckCircle2, Truck, XCircle, Search } from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/proxy/orders")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data);
        } else {
          setOrders([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING": return <Package size={16} className="text-gray-400" />;
      case "PAID": return <CheckCircle2 size={16} className="text-[#00a86b]" />;
      case "SHIPPED": return <Truck size={16} className="text-blue-500" />;
      case "DELIVERED": return <CheckCircle2 size={16} className="text-green-500" />;
      case "CANCELLED": return <XCircle size={16} className="text-[#FF003C]" />;
      default: return <Package size={16} />;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.shippingAddress?.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.shippingAddress?.firstName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col">
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert size={28} className="text-[#FF003C]" />
              <h1 className="text-3xl font-black uppercase tracking-widest">Admin Dashboard</h1>
            </div>
            <p className="text-gray-400 font-medium text-sm">System-wide Order Management</p>
          </div>
          
          <button 
            onClick={fetchOrders}
            className="flex items-center gap-2 border border-[#333] bg-[#111] hover:bg-white hover:text-black transition-colors px-4 py-2 font-bold uppercase tracking-wider text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="bg-[#111] border border-[#222] flex-1 flex flex-col">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-[#222] flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by Order ID, Email, or Name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-black border border-[#333] pl-10 pr-4 py-3 outline-none focus:border-white text-sm font-medium transition-colors"
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black border-b border-[#222] text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="p-4 font-bold">Order ID</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Customer</th>
                  <th className="p-4 font-bold">Items</th>
                  <th className="p-4 font-bold">Total Amount</th>
                  <th className="p-4 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="border-b border-[#222] hover:bg-[#1a1a1a] transition-colors">
                      <td className="p-4 align-top">
                        <span className="font-mono text-xs text-gray-300">{order.id}</span>
                      </td>
                      <td className="p-4 align-top">
                        <span className="text-sm font-medium">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <br/>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-4 align-top">
                        <span className="text-sm font-bold text-white">
                          {order.shippingAddress?.firstName || 'Unknown'} {order.shippingAddress?.lastName || ''}
                        </span>
                        <br/>
                        <span className="text-xs text-gray-400">{order.shippingAddress?.email || 'No email provided'}</span>
                        <br/>
                        <span className="text-xs text-gray-400">{order.shippingAddress?.phone || ''}</span>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2">
                          {order.items.map((item: any) => (
                            <div key={item.id} className="flex gap-3 items-start">
                              <span className="text-xs font-bold text-gray-300 bg-[#222] px-1.5 py-0.5 rounded-sm">x{item.quantity}</span>
                              <span className="text-sm font-medium text-gray-200">{item.product.title}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {"₹" + (order.totalAmount / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 align-top text-center">
                        <div className="flex flex-col items-center justify-center gap-1 mt-1">
                          {getStatusIcon(order.status)}
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            order.status === 'CANCELLED' ? 'text-[#FF003C]' : 
                            order.status === 'PAID' ? 'text-[#00a86b]' : 'text-gray-400'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
