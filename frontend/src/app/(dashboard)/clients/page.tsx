'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, Users, CreditCard, Banknote, Plus, Search, 
  ExternalLink, Mail, Phone, Trash2, ShieldAlert, X, Eye, Shield
} from 'lucide-react';
import Link from 'next/link';
import { reports as reportsApi, users as usersApi, roles as rolesApi } from '@/lib/api';
import type { ClientReportRow, User, Role } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const MOCK_CLIENTS: ClientReportRow[] = [
  { client_id: 10, client_name: 'Acme Corporation', client_email: 'client@creativals.com', active_projects: 2, total_projects: 3, total_billed: 180000, total_paid: 120000, total_outstanding: 60000, last_invoice_date: null, last_payment_date: null },
  { client_id: 11, client_name: 'Stark Industries', client_email: 'pepper@stark.com', active_projects: 1, total_projects: 2, total_billed: 500000, total_paid: 500000, total_outstanding: 0, last_invoice_date: null, last_payment_date: null },
  { client_id: 12, client_name: 'Wayne Enterprises', client_email: 'lucius@wayne.corp', active_projects: 1, total_projects: 1, total_billed: 350000, total_paid: 250000, total_outstanding: 100000, last_invoice_date: null, last_payment_date: null },
];

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('password');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Fetch client directory details using reports API
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['reports_clients'],
    queryFn: async () => {
      try {
        const res = await reportsApi.getClients();
        return res.data;
      } catch {
        return {
          summary: {
            total_clients: MOCK_CLIENTS.length,
            total_active: MOCK_CLIENTS.filter(c => c.active_projects > 0).length,
            total_billed: MOCK_CLIENTS.reduce((sum, c) => sum + c.total_billed, 0),
          },
          breakdown: MOCK_CLIENTS
        };
      }
    }
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const res = await rolesApi.list();
        return res.data as Role[];
      } catch {
        return [];
      }
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      // Find the client role
      const clientRole = roles.find(r => r.name === 'client');
      const role_ids = clientRole ? [clientRole.id] : [];
      
      return usersApi.create({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        status: 'active',
        role_ids,
        department_ids: []
      });
    },
    onSuccess: () => {
      refetch();
      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteError('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to invite client user.';
      setInviteError(msg);
    }
  });

  const clients = reportData?.breakdown || [];
  const summary = reportData?.summary || { total_clients: 0, total_active: 0, total_billed: 0 };

  const totalOutstanding = clients.reduce((sum, c) => sum + (c.total_outstanding || 0), 0);
  const totalPaid = clients.reduce((sum, c) => sum + (c.total_paid || 0), 0);

  const filteredClients = clients.filter(c => 
    c.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Name and Email are required.');
      return;
    }
    inviteMutation.mutate({
      name: inviteName,
      email: inviteEmail,
      password: invitePassword,
      phone: invitePhone
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Building2 className="text-violet-500 w-6 h-6" />
            Client Registry
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your client accounts, view project statistics, and track billing history.
          </p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Invite Client User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl relative overflow-hidden">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Clients</p>
          <h3 className="text-xl font-bold text-zinc-100 mt-1">{summary.total_clients}</h3>
          <div className="text-[10px] text-zinc-500 mt-3 flex items-center gap-1">
            <Users size={10} /> {summary.total_active} active project accounts
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl relative overflow-hidden">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Billed</p>
          <h3 className="text-xl font-bold text-zinc-150 mt-1">{formatCurrency(summary.total_billed)}</h3>
          <div className="text-[10px] text-zinc-500 mt-3">All project invoice records</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl relative overflow-hidden">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Collected Amount</p>
          <h3 className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(totalPaid)}</h3>
          <div className="text-[10px] text-zinc-500 mt-3">
            Collection Rate: <span className="text-emerald-500 font-bold">{summary.total_billed > 0 ? Math.round((totalPaid / summary.total_billed) * 100) : 0}%</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl relative overflow-hidden">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Outstanding Balance</p>
          <h3 className="text-xl font-bold text-amber-400 mt-1">{formatCurrency(totalOutstanding)}</h3>
          <div className="text-[10px] text-zinc-500 mt-3">Unpaid aging receivables</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-zinc-500 w-4.5 h-4.5" />
          <input
            type="text"
            placeholder="Search by client name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-880 text-zinc-100 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400 animate-pulse">Loading Client Directory...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <Building2 className="mx-auto w-12 h-12 text-zinc-650" />
            <h3 className="font-semibold text-zinc-300">No Clients Found</h3>
            <p className="text-xs text-zinc-500">Try adjusting your query or invite a client account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Client Organization</th>
                  <th className="p-4">Active / Total Projects</th>
                  <th className="p-4">Amount Billed</th>
                  <th className="p-4">Amount Collected</th>
                  <th className="p-4">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredClients.map((c) => (
                  <tr key={c.client_id} className="hover:bg-zinc-900/40 transition">
                    <td className="p-4">
                      <div className="font-semibold text-zinc-200">{c.client_name}</div>
                      <div className="text-[10px] text-zinc-500 font-medium">{c.client_email}</div>
                    </td>
                    <td className="p-4 font-medium">
                      <span className="text-zinc-150 font-bold">{c.active_projects}</span> Active
                      <span className="text-zinc-500 text-xs ml-1">/ {c.total_projects} Total</span>
                    </td>
                    <td className="p-4 font-bold text-zinc-150">{formatCurrency(c.total_billed)}</td>
                    <td className="p-4 font-semibold text-emerald-400">{formatCurrency(c.total_paid || 0)}</td>
                    <td className="p-4 font-semibold">
                      {c.total_outstanding > 0 ? (
                        <span className="text-amber-400">{formatCurrency(c.total_outstanding)}</span>
                      ) : (
                        <span className="text-zinc-500">— Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Client Modal */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowInviteModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-850 p-6 rounded-xl z-50 shadow-2xl flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Shield className="text-violet-500 w-5 h-5" />
                Invite Client User
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Client / Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stark Enterprises"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Client Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@domain.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. +91 99999 88888"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-zinc-150 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 bg-zinc-850 hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-zinc-100 bg-violet-650 hover:bg-violet-600 rounded-lg transition"
                >
                  {inviteMutation.isPending ? 'Inviting...' : 'Invite Client'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
