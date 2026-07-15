import React, { useState, useEffect } from 'react';
import { 
  Lock, LayoutDashboard, Coffee, Layers, Newspaper, Image, 
  Mail, Users, Settings, Plus, Edit2, Trash2, Eye, CheckCircle, 
  X, Save, FileText, Globe, Key, ShieldCheck
} from 'lucide-react';
import ImageUpload from './ImageUpload';
import { csrfHeaders } from '../auth-client.ts';
import { 
  Product, ProductCategory, Service, NewsPost, 
  GalleryImage, Inquiry, NewsletterSubscriber, SiteSettings 
} from '../types.js';

interface AdminPanelProps {
  currentUser: AdminUser | null;
  authLoading: boolean;
  onLoginSuccess: (user: AdminUser) => void;
  onLogout: () => void | Promise<void>;
  onPublicDataUpdate?: () => void | Promise<void>;
}

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: string;
}

interface SettingFieldRowProps {
  key?: string;
  fieldKey: string;
  label: string;
  initialValEn: string;
  initialValAm: string;
  onSave: (key: string, valEn: string, valAm: string) => void;
}

function SettingFieldRow({ fieldKey, label, initialValEn, initialValAm, onSave }: SettingFieldRowProps) {
  const [valEn, setValEn] = useState(initialValEn);
  const [valAm, setValAm] = useState(initialValAm);

  useEffect(() => {
    setValEn(initialValEn);
    setValAm(initialValAm);
  }, [initialValEn, initialValAm]);

  return (
    <div className="space-y-3 p-4 bg-gray-50/50 border border-[#2D2A26]/10 rounded-none">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#2D2A26]">{label}</span>
        <button
          type="button"
          onClick={() => onSave(fieldKey, valEn, valAm)}
          className="px-4 py-2 bg-[#7E4015] text-[#F8F1E7] hover:bg-[#2D2A26] rounded-none text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-all"
        >
          <Save className="h-3 w-3" />
          <span>Update</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">English (EN)</span>
          <input
            type="text"
            value={valEn}
            onChange={(e) => setValEn(e.target.value)}
            className="w-full bg-white border border-[#2D2A26]/10 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-[#7E4015] font-sans"
          />
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">አማርኛ (AM)</span>
          <input
            type="text"
            value={valAm}
            onChange={(e) => setValAm(e.target.value)}
            className="w-full bg-white border border-[#2D2A26]/10 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-[#7E4015] font-sans"
          />
        </div>
      </div>
    </div>
  );
}

type TabType = 
  | 'products' 
  | 'categories' 
  | 'services' 
  | 'news' 
  | 'gallery' 
  | 'inquiries' 
  | 'subscribers' 
  | 'settings'
  | 'admin-users';

export default function AdminPanel({ currentUser, authLoading, onLoginSuccess, onLogout, onPublicDataUpdate }: AdminPanelProps) {
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [resetMessage, setResetMessage] = useState('');
  const [recentPassword, setRecentPassword] = useState('');

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<TabType>('products');

  // Database lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [settings, setSettings] = useState<SiteSettings[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const [newAdmin, setNewAdmin] = useState({ username: '', email: '', name: '', role: 'Admin', password: '' });
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [resetAdmin, setResetAdmin] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [myPassword, setMyPassword] = useState({ current: '', next: '', confirm: '' });

  // Loading and action state
  const [loading, setLoading] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewInquiryDetail, setViewInquiryDetail] = useState<Inquiry | null>(null);

  // Notification feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const canManageAdmins = currentUser?.role.trim().toLowerCase().replace(/\s+/g, '') === 'superadmin';

  // Load backend collections
  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [resProd, resCat, resSrv, resNews, resGal, resInq, resSub, resSet, resAdmins] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/services'),
        fetch('/api/news'),
        fetch('/api/gallery'),
        fetch('/api/inquiries'),
        fetch('/api/newsletter'),
        fetch('/api/settings'),
        canManageAdmins ? fetch('/api/admin/users') : Promise.resolve(null)
      ]);

      if (resProd.ok) setProducts(await resProd.json());
      if (resCat.ok) setCategories(await resCat.json());
      if (resSrv.ok) setServices(await resSrv.json());
      if (resNews.ok) setNews(await resNews.json());
      if (resGal.ok) setGallery(await resGal.json());
      if (resInq.status === 401 || resSub.status === 401 || resAdmins?.status === 401) {
        await onLogout();
        return;
      }
      if (resInq.ok) setInquiries(await resInq.json());
      if (resSub.ok) setSubscribers(await resSub.json());
      if (resSet.ok) setSettings(await resSet.json());
      if (resAdmins?.ok) setAdminUsers(await resAdmins.json());

    } catch (err) {
      console.error('Error loading collections:', err);
      showFeedback('error', 'Failed to synchronize workspace database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, activeTab]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError('Credentials cannot be empty.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember_me: rememberMe })
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user);
      } else {
        setLoginError(data.error || 'Authentication rejected.');
      }
    } catch (err) {
      setLoginError('Unable to reach auth server.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Delete Action Handler
  const handleDelete = async (tab: TabType, id: string) => {
    if (!currentUser) return;
    if (!confirm('Are you absolutely sure you want to delete this record?')) return;

    let endpoint = '';
    switch (tab) {
      case 'products': endpoint = `/api/products/${id}`; break;
      case 'categories': endpoint = `/api/categories/${id}`; break;
      case 'services': endpoint = `/api/services/${id}`; break;
      case 'news': endpoint = `/api/news/${id}`; break;
      case 'gallery': endpoint = `/api/gallery/${id}`; break;
      case 'subscribers': endpoint = `/api/newsletter/${id}`; break;
      case 'inquiries': endpoint = `/api/inquiries/${id}`; break;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: csrfHeaders(false)
      });
      if (res.ok) {
        showFeedback('success', 'Record removed successfully.');
        void fetchData();
        void onPublicDataUpdate?.();
      } else {
        showFeedback('error', 'Unable to remove record.');
      }
    } catch {
      showFeedback('error', 'Delete operation failed.');
    }
  };

  // Inquiry status update
  const handleInquiryStatusChange = async (id: string, newStatus: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'PUT',
        headers: csrfHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showFeedback('success', `Inquiry marked as ${newStatus}.`);
        setViewInquiryDetail(null);
        fetchData();
      } else {
        showFeedback('error', 'Status modification rejected.');
      }
    } catch {
      showFeedback('error', 'Status update failed.');
    }
  };

  // Category CRUD Submission
  const handleCategorySave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      slug: formData.get('slug') as string,
      name_en: formData.get('name_en') as string,
      name_am: formData.get('name_am') as string,
      description_en: formData.get('description_en') as string,
      description_am: formData.get('description_am') as string,
    };

    const isEdit = currentEditItem && currentEditItem.id;
    const url = isEdit ? `/api/categories/${currentEditItem.id}` : '/api/categories';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: csrfHeaders(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showFeedback('success', `Category ${isEdit ? 'updated' : 'created'} successfully.`);
        setIsFormOpen(false);
        setCurrentEditItem(null);
        void fetchData();
        void onPublicDataUpdate?.();
      } else {
        const d = await res.json();
        showFeedback('error', d.error || 'Failed saving category.');
      }
    } catch {
      showFeedback('error', 'Server error saving category.');
    }
  };

  // Product CRUD Submission
  const handleProductSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      category_id: formData.get('category_id') as string,
      slug: formData.get('slug') as string,
      title_en: formData.get('title_en') as string,
      title_am: formData.get('title_am') as string,
      description_en: formData.get('description_en') as string,
      description_am: formData.get('description_am') as string,
      content_en: formData.get('content_en') as string,
      content_am: formData.get('content_am') as string,
      origin_en: formData.get('origin_en') as string,
      origin_am: formData.get('origin_am') as string,
      grade_en: formData.get('grade_en') as string,
      grade_am: formData.get('grade_am') as string,
      processing_en: formData.get('processing_en') as string,
      processing_am: formData.get('processing_am') as string,
      packaging_en: formData.get('packaging_en') as string,
      packaging_am: formData.get('packaging_am') as string,
      availability_en: formData.get('availability_en') as string,
      availability_am: formData.get('availability_am') as string,
      price_en: formData.get('price_en') as string,
      price_am: formData.get('price_am') as string,
      elevation: formData.get('elevation') as string,
      image_url: formData.get('image_url') as string,
      is_featured: formData.get('is_featured') === 'true'
    };

    const isEdit = currentEditItem && currentEditItem.id;
    const url = isEdit ? `/api/products/${currentEditItem.id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: csrfHeaders(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showFeedback('success', `Product ${isEdit ? 'updated' : 'created'} successfully.`);
        setIsFormOpen(false);
        setCurrentEditItem(null);
        void fetchData();
        void onPublicDataUpdate?.();
      } else {
        const d = await res.json();
        showFeedback('error', d.error || 'Failed saving product.');
      }
    } catch {
      showFeedback('error', 'Server error saving product.');
    }
  };

  // Service CRUD Submission
  const handleServiceSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      slug: formData.get('slug') as string,
      title_en: formData.get('title_en') as string,
      title_am: formData.get('title_am') as string,
      description_en: formData.get('description_en') as string,
      description_am: formData.get('description_am') as string,
      content_en: formData.get('content_en') as string,
      content_am: formData.get('content_am') as string,
      image_url: formData.get('image_url') as string,
      icon_name: formData.get('icon_name') as string,
    };

    const isEdit = currentEditItem && currentEditItem.id;
    const url = isEdit ? `/api/services/${currentEditItem.id}` : '/api/services';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: csrfHeaders(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showFeedback('success', `Service ${isEdit ? 'updated' : 'created'} successfully.`);
        setIsFormOpen(false);
        setCurrentEditItem(null);
        void fetchData();
        void onPublicDataUpdate?.();
      } else {
        const d = await res.json();
        showFeedback('error', d.error || 'Failed saving service.');
      }
    } catch {
      showFeedback('error', 'Server error saving service.');
    }
  };

  // News CRUD Submission
  const handleNewsSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      slug: formData.get('slug') as string,
      title_en: formData.get('title_en') as string,
      title_am: formData.get('title_am') as string,
      excerpt_en: formData.get('excerpt_en') as string,
      excerpt_am: formData.get('excerpt_am') as string,
      content_en: formData.get('content_en') as string,
      content_am: formData.get('content_am') as string,
      category_en: formData.get('category_en') as string,
      category_am: formData.get('category_am') as string,
      image_url: formData.get('image_url') as string,
      author_en: formData.get('author_en') as string,
      author_am: formData.get('author_am') as string,
    };

    const isEdit = currentEditItem && currentEditItem.id;
    const url = isEdit ? `/api/news/${currentEditItem.id}` : '/api/news';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: csrfHeaders(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showFeedback('success', `Article ${isEdit ? 'updated' : 'created'} successfully.`);
        setIsFormOpen(false);
        setCurrentEditItem(null);
        void fetchData();
        void onPublicDataUpdate?.();
      } else {
        const d = await res.json();
        showFeedback('error', d.error || 'Failed saving article.');
      }
    } catch {
      showFeedback('error', 'Server error saving news article.');
    }
  };

  // Gallery CRUD Submission
  const handleGallerySave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      title_en: formData.get('title_en') as string,
      title_am: formData.get('title_am') as string,
      category_en: formData.get('category_en') as string,
      category_am: formData.get('category_am') as string,
      description_en: formData.get('description_en') as string,
      description_am: formData.get('description_am') as string,
      image_url: formData.get('image_url') as string,
    };

    const isEdit = currentEditItem && currentEditItem.id;
    const url = isEdit ? `/api/gallery/${currentEditItem.id}` : '/api/gallery';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: csrfHeaders(),
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showFeedback('success', `Media item ${isEdit ? 'updated' : 'created'} successfully.`);
        setIsFormOpen(false);
        setCurrentEditItem(null);
        void fetchData();
        void onPublicDataUpdate?.();
      } else {
        const d = await res.json();
        showFeedback('error', d.error || 'Failed saving media.');
      }
    } catch {
      showFeedback('error', 'Server error saving media.');
    }
  };

  // Site Settings Submission
  const handleSettingSave = async (key: string, valEn: string, valAm: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ key, value_en: valEn, value_am: valAm })
      });
      if (res.ok) {
        showFeedback('success', `Setting key "${key}" saved.`);
        void fetchData();
        void onPublicDataUpdate?.();
      } else {
        showFeedback('error', 'Setting update rejected.');
      }
    } catch {
      showFeedback('error', 'Server error saving setting.');
    }
  };

  const adminHeaders = csrfHeaders();

  const responseError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.error || fallback;
    } catch {
      return fallback;
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newAdmin.password.length < 8) {
      showFeedback('error', 'Password must be at least 8 characters.');
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: adminHeaders, body: JSON.stringify(newAdmin),
      });
      if (!res.ok) return showFeedback('error', await responseError(res, 'Unable to create admin user.'));
      setNewAdmin({ username: '', email: '', name: '', role: 'Admin', password: '' });
      showFeedback('success', 'Admin user created successfully.');
      void fetchData();
    } catch {
      showFeedback('error', 'Server error creating admin user.');
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAdmin) return;
    try {
      const res = await fetch(`/api/admin/users/${editingAdmin.id}`, {
        method: 'PUT', headers: adminHeaders,
        body: JSON.stringify({ email: editingAdmin.email, name: editingAdmin.name, role: editingAdmin.role }),
      });
      if (!res.ok) return showFeedback('error', await responseError(res, 'Unable to update admin user.'));
      setEditingAdmin(null);
      showFeedback('success', 'Admin user updated successfully.');
      void fetchData();
    } catch {
      showFeedback('error', 'Server error updating admin user.');
    }
  };

  const handleResetAdminPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetAdmin) return;
    if (resetPassword.length < 8) {
      showFeedback('error', 'Password must be at least 8 characters.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${resetAdmin.id}/password`, {
        method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ password: resetPassword }),
      });
      if (!res.ok) return showFeedback('error', await responseError(res, 'Unable to reset password.'));
      setResetAdmin(null);
      setResetPassword('');
      showFeedback('success', 'Password reset successfully.');
    } catch {
      showFeedback('error', 'Server error resetting password.');
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!window.confirm(`Delete admin user "${admin.username}"?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${admin.id}`, { method: 'DELETE', headers: adminHeaders });
      if (!res.ok) return showFeedback('error', await responseError(res, 'Unable to delete admin user.'));
      showFeedback('success', 'Admin user deleted.');
      void fetchData();
    } catch {
      showFeedback('error', 'Server error deleting admin user.');
    }
  };

  const handleChangeMyPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (myPassword.next.length < 8) {
      showFeedback('error', 'New password must be at least 8 characters.');
      return;
    }
    if (myPassword.next !== myPassword.confirm) {
      showFeedback('error', 'New password confirmation does not match.');
      return;
    }
    try {
      const res = await fetch('/api/admin/me/password', {
        method: 'PATCH', headers: adminHeaders,
        body: JSON.stringify({ current_password: myPassword.current, new_password: myPassword.next }),
      });
      if (!res.ok) return showFeedback('error', await responseError(res, 'Unable to change password.'));
      setMyPassword({ current: '', next: '', confirm: '' });
      await onLogout();
    } catch {
      showFeedback('error', 'Server error changing password.');
    }
  };

  const handleConfirmRecentPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/confirm-password', {
        method: 'POST', headers: csrfHeaders(), body: JSON.stringify({ password: recentPassword }),
      });
      if (!res.ok) return showFeedback('error', await responseError(res, 'Password confirmation failed.'));
      setRecentPassword('');
      showFeedback('success', 'Password confirmed for sensitive admin actions.');
    } catch {
      showFeedback('error', 'Server error confirming password.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRecoveryMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await res.json();
      setRecoveryMessage(data.message || 'If an eligible account exists, a reset link has been sent.');
    } catch {
      setRecoveryMessage('If an eligible account exists, a reset link has been sent.');
    }
  };

  const handlePublicPasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (resetForm.password.length < 8 || resetForm.password !== resetForm.confirm) {
      setResetMessage('Passwords must match and contain at least 8 characters.');
      return;
    }
    const token = new URLSearchParams(window.location.search).get('token') || '';
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: resetForm.password, confirm_password: resetForm.confirm }),
      });
      const data = await res.json();
      if (!res.ok) return setResetMessage(data.error || 'Reset link is invalid or expired.');
      setResetForm({ password: '', confirm: '' });
      setResetMessage(data.message);
      window.history.replaceState({}, '', '/');
    } catch {
      setResetMessage('Unable to reset the password right now.');
    }
  };

  const isResetRoute = window.location.pathname === '/admin/reset-password';

  if (isResetRoute) {
    return (
      <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center p-6 font-sans">
        <form onSubmit={handlePublicPasswordReset} className="w-full max-w-md bg-[#2D2A26] p-8 text-[#F8F1E7] space-y-5">
          <div className="flex items-center gap-3"><Key className="h-5 w-5 text-[#D08A44]" /><h2 className="font-serif text-2xl font-bold">Reset Super Admin Password</h2></div>
          <p className="text-xs text-[#F8F1E7]/65">Choose a new password. Reset links expire after 20 minutes and can only be used once.</p>
          <input type="password" autoComplete="new-password" required minLength={8} placeholder="New password" value={resetForm.password} onChange={e => setResetForm({ ...resetForm, password: e.target.value })} className="w-full bg-transparent border border-[#F8F1E7]/20 px-4 py-3 text-sm focus:outline-none focus:border-[#7E4015]" />
          <input type="password" autoComplete="new-password" required minLength={8} placeholder="Confirm new password" value={resetForm.confirm} onChange={e => setResetForm({ ...resetForm, confirm: e.target.value })} className="w-full bg-transparent border border-[#F8F1E7]/20 px-4 py-3 text-sm focus:outline-none focus:border-[#7E4015]" />
          {resetMessage && <div className="text-xs bg-black/20 p-3">{resetMessage}</div>}
          <button type="submit" className="w-full bg-[#7E4015] py-3 text-xs uppercase tracking-widest font-bold">Reset Password</button>
        </form>
      </div>
    );
  }

  if (authLoading) {
    return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center text-[#7E4015] font-semibold">Checking secure session...</div>;
  }

  // Auth Redirect/Gate
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8F1E7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans" id="admin-login-screen">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-[#2D2A26] p-4 rounded-none w-14 h-14 mx-auto flex items-center justify-center border border-[#2D2A26]/10 shadow-none">
            <Lock className="h-5 w-5 text-[#F8F1E7]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-serif font-bold text-[#2D2A26] tracking-tight">
            Konjo Buna CMS Admin
          </h2>
          <p className="mt-2 text-center text-xs uppercase tracking-widest text-[#2D2A26]/75">
            Export & processing administration portal
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-[#2D2A26] py-8 px-4 shadow-none rounded-none sm:px-10 border border-[#2D2A26]/10">
            <form onSubmit={handleLoginSubmit} className="space-y-6" id="admin-login-form">
              <div>
                <label className="block text-[10px] font-bold text-[#F8F1E7]/75 uppercase tracking-widest">
                  Admin Username
                </label>
                <input
                  type="text"
                  required
                  id="admin-username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 block w-full bg-[#2D2A26] border border-[#F8F1E7]/15 focus:border-[#7E4015] rounded-none px-4 py-3 text-[#F8F1E7] placeholder-[#F8F1E7]/30 focus:outline-none text-xs font-sans"
                  placeholder="e.g. admin"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#F8F1E7]/75 uppercase tracking-widest">
                  Password Key
                </label>
                <input
                  type="password"
                  required
                  id="admin-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full bg-[#2D2A26] border border-[#F8F1E7]/15 focus:border-[#7E4015] rounded-none px-4 py-3 text-[#F8F1E7] placeholder-[#F8F1E7]/30 focus:outline-none text-xs font-sans"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between gap-4 text-[11px]">
                <label className="flex items-center gap-2 text-[#F8F1E7]/70 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="accent-[#7E4015]" />
                  Remember me for up to 7 days
                </label>
                <button type="button" onClick={() => setShowForgotPassword(!showForgotPassword)} className="text-[#D08A44] hover:text-[#F8F1E7]">
                  Forgot password?
                </button>
              </div>

              {loginError && (
                <div className="bg-red-950/40 border border-red-900/30 text-red-300 text-[11px] font-mono rounded-none p-3">
                  {loginError}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  id="admin-login-submit"
                  disabled={loginLoading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-none shadow-sm text-xs font-bold uppercase tracking-widest text-[#F8F1E7] bg-[#7E4015] hover:bg-[#2D2A26] focus:outline-none transition-all disabled:opacity-50"
                >
                  {loginLoading ? 'Authenticating...' : 'Enter Console'}
                </button>
              </div>
            </form>
            {showForgotPassword && (
              <form onSubmit={handleForgotPassword} className="mt-6 pt-6 border-t border-[#F8F1E7]/10 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#F8F1E7]/75 uppercase tracking-widest">Super Admin Email</label>
                  <input type="email" required value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder="admin@example.com" className="mt-1.5 block w-full bg-[#2D2A26] border border-[#F8F1E7]/15 focus:border-[#7E4015] px-4 py-3 text-[#F8F1E7] text-xs focus:outline-none" />
                </div>
                <button type="submit" className="w-full py-3 bg-[#F8F1E7]/10 text-[#F8F1E7] text-xs font-bold uppercase tracking-wider hover:bg-[#F8F1E7]/15">Send Reset Link</button>
                {recoveryMessage && <div className="text-[11px] text-[#F8F1E7]/70 bg-black/20 p-3">{recoveryMessage}</div>}
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin CMS Workspace Layout
  return (
    <div className="min-h-screen bg-[#F8F1E7] flex flex-col lg:flex-row font-sans" id="admin-workspace">
      
      {/* CMS Side bar */}
      <aside className="w-full lg:w-72 bg-[#2D2A26] text-[#F8F1E7] border-b lg:border-b-0 lg:border-r border-[#2D2A26]/10 flex flex-col">
        <div className="p-6 border-b border-[#2D2A26]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-[#7E4015]" />
            <h2 className="font-serif text-lg font-bold">CMS Console</h2>
          </div>
          <button 
            onClick={onLogout}
            className="lg:hidden text-red-400 hover:text-red-300 text-xs font-semibold"
          >
            Logout
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'products', label: 'Coffee Products', icon: Coffee },
            { id: 'categories', label: 'Product Categories', icon: Layers },
            { id: 'services', label: 'Export Services', icon: FileText },
            { id: 'news', label: 'News & Reports', icon: Newspaper },
            { id: 'gallery', label: 'Media Gallery', icon: Image },
            { id: 'inquiries', label: 'Inquiries Received', count: inquiries.filter(i=>i.status==='new').length, icon: Mail },
            { id: 'subscribers', label: 'Newsletter list', count: subscribers.length, icon: Users },
            { id: 'settings', label: 'Site Settings', icon: Settings },
            { id: 'admin-users', label: 'Admin Users', count: canManageAdmins ? adminUsers.length : undefined, icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const isSel = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`cms-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setIsFormOpen(false);
                  setCurrentEditItem(null);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isSel 
                    ? 'bg-[#7E4015] text-[#F8F1E7] shadow-lg shadow-black/20' 
                    : 'text-[#F8F1E7]/70 hover:bg-[#7E4015]/10 hover:text-[#F8F1E7]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.count && item.count > 0 ? (
                  <span className="bg-[#7E4015] border border-[#F8F1E7]/20 text-[#F8F1E7] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-[#7E4015]/20 hidden lg:block text-xs text-[#F8F1E7]/40 font-mono">
          <p>User: {currentUser?.username || 'Admin'}</p>
          <p className="mt-1">Role: {currentUser?.role || 'Admin'}</p>
          <button 
            onClick={onLogout}
            className="mt-4 w-full py-2 bg-red-950/20 text-red-400 border border-red-900/30 rounded-lg text-center hover:bg-red-950/40 font-semibold"
          >
            Logout Account
          </button>
        </div>
      </aside>

      {/* Main Workspace Body */}
      <main className="flex-1 p-6 sm:p-10 overflow-x-hidden">
        
        {/* Top bar with alert feedback */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#2D2A26] capitalize">
              {activeTab === 'admin-users' ? 'Admin Users & Passwords' : `${activeTab} Management`}
            </h1>
            <p className="text-sm text-[#2D2A26]/70 mt-1">
              {activeTab === 'admin-users'
                ? 'Manage authorized CMS accounts and your own password.'
                : 'Add, update, or remove live bilingual content on the website.'}
            </p>
          </div>

          {/* Add Item Button (Only for CRUD tabs) */}
          {['products', 'categories', 'services', 'news', 'gallery'].includes(activeTab) && !isFormOpen && (
            <button
              id={`cms-add-btn-${activeTab}`}
              onClick={() => {
                setCurrentEditItem(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2.5 bg-[#7E4015] text-[#F8F1E7] hover:bg-[#7E4015]/85 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-[#7E4015]/20 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create New {activeTab.slice(0, -1)}</span>
            </button>
          )}
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-md animate-fade-in ${
            feedback.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">{feedback.msg}</span>
          </div>
        )}

        {/* Workspace Views */}

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="flex justify-center py-12">
            <span className="text-[#7E4015] font-semibold animate-pulse">Syncing with database server...</span>
          </div>
        )}

        {/* ----------------- TAB: PRODUCTS FORM OR LIST ----------------- */}
        {activeTab === 'products' && !loading && (
          isFormOpen ? (
            /* Product Create / Edit Form */
            <form onSubmit={handleProductSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#7E4015]/10 shadow-xl space-y-6 max-w-4xl" id="cms-product-form">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold font-serif text-[#2D2A26]">
                  {currentEditItem ? 'Modify Product Specifications' : 'Add New Highland Single-Origin'}
                </h3>
                <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Category Allocation</label>
                  <select
                    name="category_id"
                    required
                    defaultValue={currentEditItem?.category_id || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name_en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Product Slug (URL part)</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    defaultValue={currentEditItem?.slug || ''}
                    placeholder="e.g. yirgacheffe-g1-washed"
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Title (English)</label>
                  <input
                    type="text"
                    name="title_en"
                    required
                    defaultValue={currentEditItem?.title_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">ስም / ርዕስ (አማርኛ)</label>
                  <input
                    type="text"
                    name="title_am"
                    required
                    defaultValue={currentEditItem?.title_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Elevation Profile</label>
                  <input
                    type="text"
                    name="elevation"
                    defaultValue={currentEditItem?.elevation || ''}
                    placeholder="e.g. 1,900m - 2,200m"
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Image</label>
                  <ImageUpload name="image_url" initialUrl={currentEditItem?.image_url || null} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Short Description (English)</label>
                  <textarea
                    name="description_en"
                    defaultValue={currentEditItem?.description_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">አጭር መግለጫ (አማርኛ)</label>
                  <textarea
                    name="description_am"
                    defaultValue={currentEditItem?.description_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Origin (English)</label>
                  <input
                    type="text"
                    name="origin_en"
                    defaultValue={currentEditItem?.origin_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">አመጣጥ / ዞን (አማርኛ)</label>
                  <input
                    type="text"
                    name="origin_am"
                    defaultValue={currentEditItem?.origin_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Grade (English)</label>
                  <input
                    type="text"
                    name="grade_en"
                    defaultValue={currentEditItem?.grade_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">ደረጃ (አማርኛ)</label>
                  <input
                    type="text"
                    name="grade_am"
                    defaultValue={currentEditItem?.grade_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Processing Method (English)</label>
                  <input
                    type="text"
                    name="processing_en"
                    defaultValue={currentEditItem?.processing_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">የዝግጅት ዘዴ (አማርኛ)</label>
                  <input
                    type="text"
                    name="processing_am"
                    defaultValue={currentEditItem?.processing_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Standard Packaging (English)</label>
                  <input
                    type="text"
                    name="packaging_en"
                    defaultValue={currentEditItem?.packaging_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">ማሸጊያ (አማርኛ)</label>
                  <input
                    type="text"
                    name="packaging_am"
                    defaultValue={currentEditItem?.packaging_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Contract Availability (English)</label>
                  <input
                    type="text"
                    name="availability_en"
                    defaultValue={currentEditItem?.availability_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">የዝግጁነት ሁኔታ (አማርኛ)</label>
                  <input
                    type="text"
                    name="availability_am"
                    defaultValue={currentEditItem?.availability_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Pricing / Price (English)</label>
                  <input
                    type="text"
                    name="price_en"
                    defaultValue={currentEditItem?.price_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">የዋጋ ሁኔታ (አማርኛ)</label>
                  <input
                    type="text"
                    name="price_am"
                    defaultValue={currentEditItem?.price_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Full Specs / History (English)</label>
                  <textarea
                    name="content_en"
                    defaultValue={currentEditItem?.content_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-28"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">የምርት ሙሉ መግለጫ ታሪክ (አማርኛ)</label>
                  <textarea
                    name="content_am"
                    defaultValue={currentEditItem?.content_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-28"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Featured Placement?</label>
                  <select
                    name="is_featured"
                    defaultValue={currentEditItem?.is_featured ? 'true' : 'false'}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  >
                    <option value="false">No, regular product</option>
                    <option value="true">Yes, place on Hero/Homepage</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#7E4015] hover:bg-[#7E4015]/85 text-[#F8F1E7] font-semibold rounded-xl text-sm flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Product List Table Grid */
            <div className="bg-white rounded-3xl border border-[#7E4015]/10 shadow-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2D2A26] text-[#F8F1E7] text-xs uppercase font-bold tracking-wider">
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">Product Single-Origin</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Elevation</th>
                    <th className="px-6 py-4">Featured</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {products.map((p) => {
                    const cat = categories.find(c => c.id === p.category_id);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <img src={p.image_url} className="w-12 h-12 object-cover rounded-lg border border-[#7E4015]/10" alt="" />
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          <div>{p.title_en}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{p.title_am}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {cat ? cat.name_en : 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono">
                          {p.elevation}
                        </td>
                        <td className="px-6 py-4">
                          {p.is_featured ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">Featured</span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setCurrentEditItem(p);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-all"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('products', p.id)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ----------------- TAB: CATEGORIES ----------------- */}
        {activeTab === 'categories' && !loading && (
          isFormOpen ? (
            <form onSubmit={handleCategorySave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#7E4015]/10 shadow-xl space-y-6 max-w-2xl" id="cms-category-form">
              <h3 className="text-lg font-bold font-serif text-[#2D2A26]">
                {currentEditItem ? 'Modify Category' : 'Create Category'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Slug URL segment</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    defaultValue={currentEditItem?.slug || ''}
                    placeholder="e.g. green-coffee"
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Name (English)</label>
                  <input
                    type="text"
                    name="name_en"
                    required
                    defaultValue={currentEditItem?.name_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">ስም (አማርኛ)</label>
                  <input
                    type="text"
                    name="name_am"
                    required
                    defaultValue={currentEditItem?.name_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Description (English)</label>
                  <textarea
                    name="description_en"
                    defaultValue={currentEditItem?.description_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-24"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">መግለጫ (አማርኛ)</label>
                  <textarea
                    name="description_am"
                    defaultValue={currentEditItem?.description_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-24"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="px-6 py-2 bg-[#7E4015] text-[#F8F1E7] font-semibold rounded-xl text-sm">Save Category</button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-3xl border border-[#7E4015]/10 shadow-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2D2A26] text-[#F8F1E7] text-xs uppercase font-bold tracking-wider">
                    <th className="px-6 py-4">Category Name</th>
                    <th className="px-6 py-4">Slug segment</th>
                    <th className="px-6 py-4">Description Preview</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        <div>{c.name_en}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{c.name_am}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[#7E4015]">
                        {c.slug}
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-sm truncate">
                        {c.description_en}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setCurrentEditItem(c);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('categories', c.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ----------------- TAB: SERVICES ----------------- */}
        {activeTab === 'services' && !loading && (
          isFormOpen ? (
            <form onSubmit={handleServiceSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#7E4015]/10 shadow-xl space-y-6 max-w-3xl" id="cms-service-form">
              <h3 className="text-lg font-bold font-serif text-[#2D2A26]">
                {currentEditItem ? 'Modify Export Service' : 'Add New Service Capability'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Slug URL part</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    defaultValue={currentEditItem?.slug || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Icon Name</label>
                  <input
                    type="text"
                    name="icon_name"
                    defaultValue={currentEditItem?.icon_name || 'Layers'}
                    placeholder="Layers, Globe, Handshake"
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Title (English)</label>
                  <input
                    type="text"
                    name="title_en"
                    required
                    defaultValue={currentEditItem?.title_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">ስም / አገልግሎት (አማርኛ)</label>
                  <input
                    type="text"
                    name="title_am"
                    required
                    defaultValue={currentEditItem?.title_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Brief Description (English)</label>
                  <textarea
                    name="description_en"
                    defaultValue={currentEditItem?.description_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-20"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">አጭር መግለጫ (አማርኛ)</label>
                  <textarea
                    name="description_am"
                    defaultValue={currentEditItem?.description_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-20"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Full Details (English)</label>
                  <textarea
                    name="content_en"
                    defaultValue={currentEditItem?.content_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-32"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">ዝርዝር መግለጫ ታሪክ (አማርኛ)</label>
                  <textarea
                    name="content_am"
                    defaultValue={currentEditItem?.content_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-32"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Service Image</label>
                  <ImageUpload name="image_url" initialUrl={currentEditItem?.image_url || null} />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="px-6 py-2.5 bg-[#7E4015] text-[#F8F1E7] font-semibold rounded-xl text-sm">Save Service</button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-3xl border border-[#7E4015]/10 shadow-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2D2A26] text-[#F8F1E7] text-xs uppercase font-bold tracking-wider">
                    <th className="px-6 py-4">Service Capability</th>
                    <th className="px-6 py-4">Slug route</th>
                    <th className="px-6 py-4">Representative Image</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        <div>{s.title_en}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{s.title_am}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[#7E4015]">
                        {s.slug}
                      </td>
                      <td className="px-6 py-4">
                        <img src={s.image_url} className="w-16 h-10 object-cover rounded" alt="" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setCurrentEditItem(s);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('services', s.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ----------------- TAB: NEWS ----------------- */}
        {activeTab === 'news' && !loading && (
          isFormOpen ? (
            <form onSubmit={handleNewsSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#7E4015]/10 shadow-xl space-y-6 max-w-3xl" id="cms-news-form">
              <h3 className="text-lg font-bold font-serif text-[#2D2A26]">
                {currentEditItem ? 'Modify News Bulletin' : 'Draft New Article'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Slug Link segment</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    defaultValue={currentEditItem?.slug || ''}
                    placeholder="e.g. coffee-harvest-forecast-2026"
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Article Image</label>
                  <ImageUpload name="image_url" initialUrl={currentEditItem?.image_url || null} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Title (English)</label>
                  <input
                    type="text"
                    name="title_en"
                    required
                    defaultValue={currentEditItem?.title_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">ርዕስ (አማርኛ)</label>
                  <input
                    type="text"
                    name="title_am"
                    required
                    defaultValue={currentEditItem?.title_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Category (English)</label>
                  <input
                    type="text"
                    name="category_en"
                    defaultValue={currentEditItem?.category_en || 'Market Report'}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">ምድብ (አማርኛ)</label>
                  <input
                    type="text"
                    name="category_am"
                    defaultValue={currentEditItem?.category_am || 'የገበያ ሪፖርት'}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Author (English)</label>
                  <input
                    type="text"
                    name="author_en"
                    defaultValue={currentEditItem?.author_en || 'Ashenafi Hailu'}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">ዘጋቢ / ጸሐፊ (አማርኛ)</label>
                  <input
                    type="text"
                    name="author_am"
                    defaultValue={currentEditItem?.author_am || 'አሸናፊ ኃይሉ'}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Excerpt / Preview (English)</label>
                  <textarea
                    name="excerpt_en"
                    defaultValue={currentEditItem?.excerpt_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-16"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">አጭር መግለጫ ይዘት (አማርኛ)</label>
                  <textarea
                    name="excerpt_am"
                    defaultValue={currentEditItem?.excerpt_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-16"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Full Body Article (English)</label>
                  <textarea
                    name="content_en"
                    defaultValue={currentEditItem?.content_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-36"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2D2A26]/80">ሙሉ ጽሑፍ ይዘት (አማርኛ)</label>
                  <textarea
                    name="content_am"
                    defaultValue={currentEditItem?.content_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-36"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="px-6 py-2.5 bg-[#7E4015] text-[#F8F1E7] font-semibold rounded-xl text-sm">Save Post</button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-3xl border border-[#7E4015]/10 shadow-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2D2A26] text-[#F8F1E7] text-xs uppercase font-bold tracking-wider">
                    <th className="px-6 py-4">Report Headline</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Author</th>
                    <th className="px-6 py-4">Publish Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {news.map((n) => (
                    <tr key={n.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        <div>{n.title_en}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{n.title_am}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {n.category_en}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {n.author_en}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {new Date(n.published_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setCurrentEditItem(n);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('news', n.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ----------------- TAB: GALLERY ----------------- */}
        {activeTab === 'gallery' && !loading && (
          isFormOpen ? (
            <form onSubmit={handleGallerySave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#7E4015]/10 shadow-xl space-y-6 max-w-2xl" id="cms-gallery-form">
              <h3 className="text-lg font-bold font-serif text-[#2D2A26]">
                {currentEditItem ? 'Modify Gallery Asset' : 'Upload Gallery Asset'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26]/80">Category (English)</label>
                    <input
                      type="text"
                      name="category_en"
                      defaultValue={currentEditItem?.category_en || 'Processing'}
                      className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26]/80">ምድብ (አማርኛ)</label>
                    <input
                      type="text"
                      name="category_am"
                      defaultValue={currentEditItem?.category_am || 'ማቀነባበር'}
                      className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Gallery Image</label>
                  <ImageUpload name="image_url" initialUrl={currentEditItem?.image_url || null} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26]/80">Title (English)</label>
                    <input
                      type="text"
                      name="title_en"
                      required
                      defaultValue={currentEditItem?.title_en || ''}
                      className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26]/80">ርዕስ (አማርኛ)</label>
                    <input
                      type="text"
                      name="title_am"
                      required
                      defaultValue={currentEditItem?.title_am || ''}
                      className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">Caption / Description (English)</label>
                  <textarea
                    name="description_en"
                    defaultValue={currentEditItem?.description_en || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-16"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26]/80">መግለጫ ማብራሪያ (አማርኛ)</label>
                  <textarea
                    name="description_am"
                    defaultValue={currentEditItem?.description_am || ''}
                    className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none h-16"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="px-6 py-2.5 bg-[#7E4015] text-[#F8F1E7] font-semibold rounded-xl text-sm">Save Asset</button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" id="cms-gallery-list">
              {gallery.map((g) => (
                <div key={g.id} className="bg-white border border-[#7E4015]/10 rounded-2xl overflow-hidden shadow-md flex flex-col">
                  <div className="relative h-44 bg-gray-100">
                    <img src={g.image_url} className="w-full h-full object-cover" alt="" />
                    <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-lg border border-white/10">{g.category_en}</span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-[#2D2A26]">{g.title_en}</h4>
                      <p className="text-xs text-gray-400 mt-1">{g.title_am}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-50">
                      <button
                        onClick={() => {
                          setCurrentEditItem(g);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-all"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('gallery', g.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ----------------- TAB: INQUIRIES ----------------- */}
        {activeTab === 'inquiries' && !loading && (
          viewInquiryDetail ? (
            /* Inquiry Detailed Reader View */
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#7E4015]/15 shadow-xl max-w-3xl space-y-6" id="cms-inquiry-detail-view">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold font-serif text-[#2D2A26]">Export inquiry specification</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">ID: {viewInquiryDetail.id}</p>
                </div>
                <button onClick={() => setViewInquiryDetail(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Importer / Company</span>
                  <span className="font-semibold text-[#2D2A26]">{viewInquiryDetail.company_name}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Contact Name</span>
                  <span className="font-semibold text-[#2D2A26]">{viewInquiryDetail.contact_name}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Country</span>
                  <span className="font-semibold text-[#2D2A26]">{viewInquiryDetail.country || '-'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Contact Info</span>
                  <span className="font-semibold text-[#2D2A26]">{viewInquiryDetail.email} <br /> {viewInquiryDetail.phone}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Coffee Variety Selection</span>
                  <span className="font-semibold text-[#7E4015]">{viewInquiryDetail.coffee_type}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Volume & Price Target</span>
                  <span className="font-semibold text-[#2D2A26]">{viewInquiryDetail.volume_required || '-'} at {viewInquiryDetail.target_price || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs font-bold text-gray-400 uppercase mb-1">Message Detail / specs</span>
                  <div className="p-4 bg-[#F8F1E7]/30 border border-[#7E4015]/10 rounded-xl leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {viewInquiryDetail.message}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Modify status:</span>
                  {['new', 'contacted', 'resolved', 'archived'].map((st) => (
                    <button
                      key={st}
                      id={`inq-status-btn-${st}`}
                      onClick={() => handleInquiryStatusChange(viewInquiryDetail.id, st as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${
                        viewInquiryDetail.status === st 
                          ? 'bg-[#7E4015] text-[#F8F1E7] shadow-sm' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleDelete('inquiries', viewInquiryDetail.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold text-xs hover:bg-red-100"
                >
                  Delete Inquiry
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#7E4015]/10 shadow-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2D2A26] text-[#F8F1E7] text-xs uppercase font-bold tracking-wider">
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Country</th>
                    <th className="px-6 py-4">Requested Coffee</th>
                    <th className="px-6 py-4">Required Volume</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {inquiries.map((inq) => (
                    <tr key={inq.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{inq.company_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{inq.contact_name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {inq.country || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-[#7E4015] font-medium">
                        {inq.coffee_type}
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {inq.volume_required || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full capitalize border ${
                          inq.status === 'new' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          inq.status === 'contacted' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          inq.status === 'resolved' ? 'bg-green-50 border-green-200 text-green-700' :
                          'bg-gray-50 border-gray-200 text-gray-700'
                        }`}>
                          {inq.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`view-inq-btn-${inq.id}`}
                            onClick={() => setViewInquiryDetail(inq)}
                            className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg"
                            title="Read Message"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('inquiries', inq.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ----------------- TAB: SUBSCRIBERS ----------------- */}
        {activeTab === 'subscribers' && !loading && (
          <div className="max-w-2xl bg-white rounded-3xl border border-[#7E4015]/10 shadow-lg overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-100">
              <h3 className="font-serif font-bold text-gray-900">Email Marketing Subscribers</h3>
              <p className="text-xs text-gray-500">Subscribers who opted in via public footer or home bulletins.</p>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#2D2A26] text-[#F8F1E7] text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Opt-in Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{sub.email}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{new Date(sub.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete('subscribers', sub.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ----------------- TAB: ADMIN USERS & PASSWORDS ----------------- */}
        {activeTab === 'admin-users' && !loading && (
          <div className="space-y-6 max-w-5xl" id="cms-admin-users-view">
            <form onSubmit={handleChangeMyPassword} className="bg-white p-6 rounded-2xl border border-[#7E4015]/10 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <Key className="h-5 w-5 text-[#7E4015]" />
                <div>
                  <h3 className="font-serif font-bold text-[#2D2A26]">Change My Password</h3>
                  <p className="text-xs text-gray-500">Enter your current password before choosing a new one.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="password" autoComplete="current-password" required placeholder="Current password" value={myPassword.current} onChange={e => setMyPassword({ ...myPassword, current: e.target.value })} className="w-full border border-gray-200 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#7E4015]" />
                <input type="password" autoComplete="new-password" required minLength={8} placeholder="New password (8+ characters)" value={myPassword.next} onChange={e => setMyPassword({ ...myPassword, next: e.target.value })} className="w-full border border-gray-200 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#7E4015]" />
                <input type="password" autoComplete="new-password" required minLength={8} placeholder="Confirm new password" value={myPassword.confirm} onChange={e => setMyPassword({ ...myPassword, confirm: e.target.value })} className="w-full border border-gray-200 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#7E4015]" />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-[#7E4015] text-white rounded-lg text-sm font-semibold hover:bg-[#653310]">Change My Password</button>
            </form>

            {canManageAdmins ? (
              <>
                <form onSubmit={handleConfirmRecentPassword} className="bg-[#2D2A26] p-6 rounded-2xl text-[#F8F1E7] space-y-3">
                  <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#D08A44]" /><div><h3 className="font-serif font-bold">Confirm Sensitive Actions</h3><p className="text-xs text-[#F8F1E7]/60">Confirm your password before changing roles, deleting users, or resetting another password. Confirmation lasts 10 minutes.</p></div></div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="password" autoComplete="current-password" required placeholder="Your current password" value={recentPassword} onChange={e => setRecentPassword(e.target.value)} className="flex-1 bg-transparent border border-[#F8F1E7]/20 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#7E4015]" />
                    <button type="submit" className="px-5 py-2.5 bg-[#7E4015] text-white rounded-lg text-sm font-semibold">Confirm Password</button>
                  </div>
                </form>

                <form onSubmit={handleCreateAdmin} className="bg-white p-6 rounded-2xl border border-[#7E4015]/10 shadow-sm space-y-5">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <Plus className="h-5 w-5 text-[#7E4015]" />
                    <div>
                      <h3 className="font-serif font-bold text-[#2D2A26]">Add Admin User</h3>
                      <p className="text-xs text-gray-500">Create a separate account for each person who manages the CMS.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required placeholder="Username" value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} className="border border-gray-200 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#7E4015]" />
                    <input type="email" required placeholder="Email address" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="border border-gray-200 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#7E4015]" />
                    <input required placeholder="Full name" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} className="border border-gray-200 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#7E4015]" />
                    <select required value={newAdmin.role} onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value })} className="border border-gray-200 px-4 py-3 rounded-lg text-sm bg-white focus:outline-none focus:border-[#7E4015]">
                      <option value="Admin">Admin</option>
                      <option value="Superadmin">Super Admin</option>
                    </select>
                    <input type="password" autoComplete="new-password" required minLength={8} placeholder="Temporary password (8+ characters)" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="border border-gray-200 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#7E4015]" />
                  </div>
                  <button type="submit" className="px-5 py-2.5 bg-[#2D2A26] text-white rounded-lg text-sm font-semibold hover:bg-black">Create Admin User</button>
                </form>

                {editingAdmin && (
                  <form onSubmit={handleUpdateAdmin} className="bg-amber-50 p-6 rounded-2xl border border-amber-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[#2D2A26]">Edit {editingAdmin.username}</h3>
                      <button type="button" onClick={() => setEditingAdmin(null)} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input type="email" required value={editingAdmin.email || ''} onChange={e => setEditingAdmin({ ...editingAdmin, email: e.target.value })} className="border border-amber-200 px-4 py-3 rounded-lg text-sm" placeholder="Email address" />
                      <input required value={editingAdmin.name} onChange={e => setEditingAdmin({ ...editingAdmin, name: e.target.value })} className="border border-amber-200 px-4 py-3 rounded-lg text-sm" />
                      <select required value={editingAdmin.role} onChange={e => setEditingAdmin({ ...editingAdmin, role: e.target.value })} className="border border-amber-200 px-4 py-3 rounded-lg text-sm bg-white">
                        <option value="Admin">Admin</option>
                        <option value="Superadmin">Super Admin</option>
                      </select>
                    </div>
                    <button type="submit" className="px-5 py-2.5 bg-[#7E4015] text-white rounded-lg text-sm font-semibold">Save Admin Details</button>
                  </form>
                )}

                {resetAdmin && (
                  <form onSubmit={handleResetAdminPassword} className="bg-blue-50 p-6 rounded-2xl border border-blue-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-[#2D2A26]">Reset password for {resetAdmin.username}</h3>
                        <p className="text-xs text-gray-500">The new password is saved securely and will not be displayed afterward.</p>
                      </div>
                      <button type="button" onClick={() => { setResetAdmin(null); setResetPassword(''); }} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input type="password" autoComplete="new-password" required minLength={8} placeholder="New password (8+ characters)" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="flex-1 border border-blue-200 px-4 py-3 rounded-lg text-sm" />
                      <button type="submit" className="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold">Save New Password</button>
                    </div>
                  </form>
                )}

                <div className="bg-white rounded-2xl border border-[#7E4015]/10 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="font-serif font-bold text-[#2D2A26]">Authorized Admin Users</h3>
                    <p className="text-xs text-gray-500">Only Super Admins can edit, reset, or remove other accounts.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#2D2A26] text-[#F8F1E7] text-xs uppercase tracking-wider">
                        <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {adminUsers.map(admin => (
                          <tr key={admin.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4"><div className="font-semibold text-[#2D2A26]">{admin.name}</div><div className="text-xs text-gray-500">@{admin.username}{admin.id === currentUser?.id || admin.username === currentUser?.username ? ' · You' : ''}</div><div className="text-xs text-gray-400">{admin.email || 'Email not configured'}</div></td>
                            <td className="px-6 py-4"><span className="inline-flex px-2.5 py-1 rounded-full bg-[#7E4015]/10 text-[#7E4015] text-xs font-bold">{admin.role}</span></td>
                            <td className="px-6 py-4"><div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setEditingAdmin({ ...admin })} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Edit admin"><Edit2 className="h-4 w-4" /></button>
                              <button type="button" onClick={() => { setResetAdmin(admin); setResetPassword(''); }} className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg" title="Reset password"><Key className="h-4 w-4" /></button>
                              <button type="button" disabled={admin.id === currentUser?.id || admin.username === currentUser?.username} onClick={() => void handleDeleteAdmin(admin)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" title="Delete admin"><Trash2 className="h-4 w-4" /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-[#7E4015]/10 text-sm text-gray-600">
                Admin user creation, editing, deletion, and password resets require Super Admin permission.
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB: SETTINGS ----------------- */}
        {activeTab === 'settings' && !loading && (
          <div className="max-w-3xl bg-white p-6 sm:p-8 rounded-none border border-[#2D2A26]/10 shadow-none space-y-6" id="cms-settings-view">
            <h3 className="font-serif font-bold text-[#2D2A26] text-lg border-b border-gray-100 pb-4">Corporate Origin Parameters</h3>
            
            {[
              { key: 'site_title', label: 'Bilingual Site Headline', valEn: settings.find(s=>s.key==='site_title')?.value_en || '', valAm: settings.find(s=>s.key==='site_title')?.value_am || '' },
              { key: 'company_phone', label: 'Corporate Office Telephone', valEn: settings.find(s=>s.key==='company_phone')?.value_en || '', valAm: settings.find(s=>s.key==='company_phone')?.value_am || '' },
              { key: 'company_email', label: 'Inquiry Dispatch Email', valEn: settings.find(s=>s.key==='company_email')?.value_en || '', valAm: settings.find(s=>s.key==='company_email')?.value_am || '' },
              { key: 'company_address', label: 'Addis Ababa Office Address', valEn: settings.find(s=>s.key==='company_address')?.value_en || '', valAm: settings.find(s=>s.key==='company_address')?.value_am || '' }
            ].map((field) => (
              <SettingFieldRow
                key={field.key}
                fieldKey={field.key}
                label={field.label}
                initialValEn={field.valEn}
                initialValAm={field.valAm}
                onSave={handleSettingSave}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
