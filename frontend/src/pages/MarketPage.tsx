import React, { useState } from 'react';
import { Lock, Truck, ShoppingBag, ShieldCheck, CheckCircle, XCircle, Clock, Image as ImageIcon, User as UserIcon, Search, ShoppingCart, Plus, Info, AlertCircle, HelpCircle } from 'lucide-react';
import { translations, type LangType } from '../lib/locale';

interface MarketPageProps {
  currentUser: any;
  marketSubTab: 'shop' | 'fleet' | 'logistics' | 'admin';
  setMarketSubTab: (tab: 'shop' | 'fleet' | 'logistics' | 'admin') => void;
  marketProducts: any[];
  cartItems: any[];
  isCartOpen: boolean;
  setIsCartOpen: (v: boolean) => void;
  razorpayLoading: boolean;
  aiRecommendation: any;
  isSellModalOpen: boolean;
  setIsSellModalOpen: (v: boolean) => void;
  sellFertName: string;
  setSellFertName: (v: string) => void;
  sellFertPrice: string;
  setSellFertPrice: (v: string) => void;
  sellFertNpk: string;
  setSellFertNpk: (v: string) => void;
  bookings: any[];
  escrows: any[];
  logisticsList: any[];
  adminData: any;
  newBookingType: string;
  setNewBookingType: (v: string) => void;
  newBookingDate: string;
  setNewBookingDate: (v: string) => void;
  bookingTime: string;
  setBookingTime: (v: string) => void;
  bookingEmail: string;
  setBookingEmail: (v: string) => void;
  bookingPhone: string;
  setBookingPhone: (v: string) => void;
  bookingAddress: string;
  setBookingAddress: (v: string) => void;
  bookingCost: string;
  setBookingCost: (v: string) => void;
  onBookingSubmit: (e: React.FormEvent) => void;
  onAddToCart: (product: any) => void;
  onCheckout: () => void;
  onSellSubmit: (formData: any) => void;
  onFetchAIRecommendation: () => void;
  onDispatchColdStorage: (id: string, storeName: string) => void;
  pendingListings: any[];
  onApproveListing: (id: string) => void;
  onRejectListing: (id: string) => void;
  lang: LangType;
}

const MarketPage: React.FC<MarketPageProps> = ({
  currentUser,
  marketSubTab,
  setMarketSubTab,
  marketProducts,
  cartItems,
  isCartOpen,
  setIsCartOpen,
  razorpayLoading,
  aiRecommendation,
  isSellModalOpen,
  setIsSellModalOpen,
  sellFertName,
  setSellFertName,
  sellFertPrice,
  setSellFertPrice,
  sellFertNpk,
  setSellFertNpk,
  bookings,
  escrows,
  logisticsList,
  adminData,
  newBookingType,
  setNewBookingType,
  newBookingDate,
  setNewBookingDate,
  bookingTime,
  setBookingTime,
  bookingEmail,
  setBookingEmail,
  bookingPhone,
  setBookingPhone,
  bookingAddress,
  setBookingAddress,
  bookingCost,
  setBookingCost,
  onBookingSubmit,
  onAddToCart,
  onCheckout,
  onSellSubmit,
  onFetchAIRecommendation,
  onDispatchColdStorage,
  pendingListings,
  onApproveListing,
  onRejectListing,
  lang,
}) => {
  const t = translations[lang];
  const isAdmin = currentUser?.role === 'admin';

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Product detail popup
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Sell modal extra fields state
  const [sellImageUrl, setSellImageUrl] = useState('');
  const [sellWeight, setSellWeight] = useState('');
  const [sellStock, setSellStock] = useState('10');
  const [sellCategory, setSellCategory] = useState('Organic');
  const [sellDescription, setSellDescription] = useState('');
  const [sellSellerPhone, setSellSellerPhone] = useState('');
  const [sellSellerEmail, setSellSellerEmail] = useState('');

  // Handle fallback images
  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  // Categories list
  const categories = ['All', 'Nitrogenous', 'Phosphatic', 'Potassic', 'Organic', 'Bio-Fertilizer', 'General'];

  // Filter products locally for search & categories
  const filteredProducts = marketProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.seller_name && p.seller_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSellFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSellSubmit({
      name: sellFertName,
      npk_ratio: sellFertNpk,
      price: sellFertPrice,
      weight: sellWeight,
      stock: sellStock,
      category: sellCategory,
      description: sellDescription,
      seller_phone: sellSellerPhone || currentUser?.phone || '',
      seller_email: sellSellerEmail || currentUser?.email || '',
      image_url: sellImageUrl,
    });
    // Reset local fields
    setSellImageUrl('');
    setSellWeight('');
    setSellStock('10');
    setSellCategory('Organic');
    setSellDescription('');
    setSellSellerPhone('');
    setSellSellerEmail('');
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative' }}>

      {/* Internal Left sub-navigation tab list */}
      <div 
        style={{ 
          width: '185px', flexShrink: 0, display: 'flex', flexDirection: 'column', 
          gap: '10px', borderRight: '1px solid var(--border-gov)', paddingRight: '1.25rem' 
        }}
      >
        <button
          onClick={() => setMarketSubTab('shop')}
          className={`btn ${marketSubTab === 'shop' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.82rem', width: '100%', borderRadius: '10px' }}
        >
          <ShoppingCart size={16} />
          {t.marketShopTab}
        </button>
        <button
          onClick={() => setMarketSubTab('fleet')}
          className={`btn ${marketSubTab === 'fleet' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.82rem', width: '100%', borderRadius: '10px' }}
        >
          <Truck size={16} />
          {t.marketFleetTab}
        </button>
        <button
          onClick={() => setMarketSubTab('logistics')}
          className={`btn ${marketSubTab === 'logistics' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.82rem', width: '100%', borderRadius: '10px' }}
        >
          <Truck size={16} />
          {lang === 'hi' ? 'लॉजिस्टिक्स ट्रैकिंग' : lang === 'mr' ? 'लॉजिस्टिक्स ट्रॅकिंग' : 'Logistics Ledgers'}
        </button>

        {/* Admin tab - visible for admin role or admin@demo.com */}
        {(isAdmin || currentUser?.email === 'admin@demo.com') && (
          <button
            onClick={() => setMarketSubTab('admin')}
            className={`btn ${marketSubTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              justifyContent: 'flex-start', padding: '0.75rem 1rem', fontSize: '0.82rem', 
              width: '100%', borderRadius: '10px',
              background: marketSubTab === 'admin' ? 'var(--primary-deep)' : '#fff7ed', 
              color: marketSubTab === 'admin' ? '#ffffff' : '#c2410c', 
              borderColor: '#fdba74',
              fontWeight: 800
            }}
          >
            🛡️ Admin Panel
          </button>
        )}
      </div>

      {/* Right Scrollable content area */}
      <div style={{ flex: 1, display: 'flex', gap: '1.25rem' }}>
        
        {/* Main Feed */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* --- SHOP TAB --- */}
          {marketSubTab === 'shop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* E-Commerce Hero Header */}
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', 
                  borderRadius: '12px', 
                  padding: '1.5rem', 
                  color: '#ffffff',
                  boxShadow: '0 4px 15px rgba(21, 128, 61, 0.15)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '20px', fontWeight: 700 }}>
                      Kisan Agri-Exchange
                    </span>
                    <h2 style={{ fontSize: '1.5rem', color: '#ffffff', fontWeight: 800, marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                      Premium Fertilizers &amp; Supplements
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: '#dcfce7' }}>
                      Directly trade organic composites &amp; verified micro-nutrients. Custom self-formulated options welcome.
                    </p>
                  </div>
                  
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setIsSellModalOpen(true)} 
                      className="btn" 
                      style={{ 
                        background: '#ffffff', 
                        color: '#15803d', 
                        borderColor: '#ffffff', 
                        fontWeight: 800,
                        padding: '0.6rem 1.2rem',
                        fontSize: '0.82rem',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                      }}
                    >
                      + Sell Supplement
                    </button>
                    <button 
                      onClick={() => setIsCartOpen(!isCartOpen)} 
                      className="btn btn-primary" 
                      style={{ 
                        background: 'var(--primary-deep)', 
                        borderColor: 'var(--primary-deep)',
                        fontWeight: 800,
                        padding: '0.6rem 1rem',
                        fontSize: '0.82rem',
                        borderRadius: '8px'
                      }}
                    >
                      <ShoppingCart size={16} />
                      Cart ({cartItems.reduce((acc, i) => acc + i.qty, 0)})
                    </button>
                  </div>
                </div>

                {/* E-Commerce stats row */}
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: '0.8rem', color: '#f0fdf4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} />
                    <span>100% Quality Inspected</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={16} />
                    <span>Secure Cold Chain Transit</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={16} />
                    <span>Safe Escrow Settlements</span>
                  </div>
                </div>
              </div>

              {/* Search and Filters Section */}
              <div className="glass-panel" style={{ padding: '1rem', background: '#ffffff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search fertilizers, brands, sellers..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', paddingLeft: '2.25rem', borderRadius: '8px', fontSize: '0.82rem' }}
                    />
                  </div>

                  {/* Recommendations Trigger */}
                  <button 
                    onClick={onFetchAIRecommendation} 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
                  >
                    <ShieldCheck size={14} style={{ color: 'var(--primary-emerald)' }} />
                    AI Soil Diagnostic Scan
                  </button>
                </div>

                {/* Category Chips */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '0.85rem', paddingBottom: '2px' }} className="hide-scrollbar">
                  {categories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: selectedCategory === cat ? 'var(--primary-emerald)' : 'var(--border-gov)',
                        background: selectedCategory === cat ? 'var(--primary-mint)' : '#ffffff',
                        color: selectedCategory === cat ? 'var(--primary-emerald)' : 'var(--text-body)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat === 'All' ? '🌱 All Products' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Prediction Alert box */}
              {aiRecommendation && (
                <div 
                  className="glass-panel animate-fade-up" 
                  style={{ 
                    padding: '1rem', 
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                    borderColor: '#93c5fd',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ background: '#3b82f6', color: '#ffffff', padding: '6px', borderRadius: '50%' }}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        AI Soil Telemetry Match Recommendation
                        <span style={{ fontSize: '0.7rem', background: '#3b82f6', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                          {aiRecommendation.confidence_score || '94'}% Match
                        </span>
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#1e40af', marginTop: '3px', fontWeight: 600 }}>
                        We recommend: <strong style={{ textDecoration: 'underline' }}>{aiRecommendation.recommended_product || aiRecommendation.recommendation}</strong>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '2px', fontStyle: 'italic' }}>
                        "{aiRecommendation.reasoning || aiRecommendation.dosage || 'Optimize moisture level & add required nitrogen mix'}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Products Catalog section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary-deep)', fontWeight: 800 }}>
                    Catalog ({filteredProducts.length} items found)
                  </h3>
                  {selectedCategory !== 'All' && (
                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                      Filtered by: <strong>{selectedCategory}</strong>
                    </span>
                  )}
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', background: '#ffffff', borderRadius: '12px' }}>
                    <HelpCircle size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>No products matched your search.</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Try switching category filter chips or clearing the search query.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1.25rem' }}>
                    {filteredProducts.map((p, idx) => {
                      const originalPrice = Math.round(p.price * 1.18); // simulate a 18% strikeout discount for catalog feel
                      const isImageBroken = imageErrors[p.id] || !p.image_url;

                      return (
                        <div 
                          key={p.id || idx} 
                          className="glass-panel" 
                          style={{ 
                            background: '#ffffff',
                            borderRadius: '12px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            overflow: 'hidden', 
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => setSelectedProduct(p)}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                          }}
                        >
                          {/* Image Box */}
                          <div style={{ position: 'relative', width: '100%', height: '145px', overflow: 'hidden', background: '#f8fafc' }}>
                            {!isImageBroken ? (
                              <img 
                                src={p.image_url} 
                                alt={p.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={() => handleImageError(p.id)}
                              />
                            ) : (
                              // Beautiful CSS illustration box if image URL is invalid or offline
                              <div 
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  padding: '1rem',
                                  textAlign: 'center'
                                }}
                              >
                                <div style={{ background: '#bbf7d0', color: '#166534', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '4px', fontWeight: 800, fontSize: '1rem' }}>
                                  {p.name.substring(0,2).toUpperCase()}
                                </div>
                                <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>{p.category}</span>
                              </div>
                            )}

                            {/* Category Badge overlay */}
                            <span 
                              style={{ 
                                position: 'absolute', 
                                top: '8px', 
                                left: '8px', 
                                fontSize: '0.65rem', 
                                background: p.category === 'Organic' ? '#15803d' : '#1d4ed8', 
                                color: '#ffffff', 
                                padding: '3px 8px', 
                                borderRadius: '20px', 
                                fontWeight: 800,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              {p.category || 'Supplement'}
                            </span>

                            {/* NPK Ratio overlay */}
                            {p.npk_ratio && p.npk_ratio !== 'N/A' && (
                              <span 
                                style={{ 
                                  position: 'absolute', 
                                  bottom: '8px', 
                                  right: '8px', 
                                  fontSize: '0.62rem', 
                                  background: 'rgba(15,23,42,0.75)', 
                                  color: '#ffffff', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px', 
                                  fontWeight: 700 
                                }}
                              >
                                NPK: {p.npk_ratio}
                              </span>
                            )}
                          </div>

                          {/* Card Content details */}
                          <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                            
                            {/* Product Title */}
                            <div style={{ minHeight: '38px' }}>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0, lineClamp: 2, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {p.name}
                              </h4>
                            </div>

                            {/* Seller name and verified tag */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              <UserIcon size={11} />
                              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.seller_name || p.seller}
                              </span>
                              <span style={{ color: '#22c55e', fontSize: '0.65rem' }}>●</span>
                            </div>

                            {/* Weight and Stock */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                              <span>Pack: <strong>{p.weight || '50kg'}</strong></span>
                              <span style={{ color: p.stock <= 5 ? '#ef4444' : '#15803d', fontWeight: p.stock <= 5 ? 700 : 500 }}>
                                {p.stock <= 5 ? `Only ${p.stock} left!` : `Stock: ${p.stock}`}
                              </span>
                            </div>

                            {/* Price and Cart controls */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
                              <div>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', textDecoration: 'line-through', marginRight: '4px' }}>
                                  ₹{originalPrice}
                                </span>
                                <strong style={{ color: '#166534', fontSize: '0.98rem', display: 'block' }}>
                                  ₹{p.price}
                                </strong>
                              </div>
                              
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  onAddToCart(p); 
                                }} 
                                className="btn btn-primary" 
                                style={{ 
                                  padding: '4px 10px', 
                                  fontSize: '0.72rem', 
                                  borderRadius: '6px', 
                                  background: 'var(--primary-emerald)',
                                  borderColor: 'var(--primary-emerald)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Plus size={12} />
                                Buy
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* --- FLEET TAB --- */}
          {marketSubTab === 'fleet' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }} className="grid-2">
              
              {/* Book Form */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: '1rem', fontWeight: 800 }}>{t.marketBookFleetTitle}</h4>
                <form onSubmit={onBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t.marketBookTypeLabel}</label>
                    <select value={newBookingType} onChange={(e) => {
                      setNewBookingType(e.target.value);
                      setBookingCost(e.target.value === 'drone_sprayer' ? '3500' : '12000');
                    }} style={{ width: '100%' }}>
                      <option value="drone_sprayer">Drone Bio-Sprayer (1 Day Scan)</option>
                      <option value="harvester">Heavy Crop Harvester</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t.marketBookDateLabel}</label>
                      <input type="date" value={newBookingDate} onChange={(e) => setNewBookingDate(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t.marketBookTimeLabel}</label>
                      <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t.marketBookEmailLabel}</label>
                    <input type="email" placeholder="farmer@village.com" value={bookingEmail} onChange={(e) => setBookingEmail(e.target.value)} style={{ width: '100%' }} required />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t.marketBookPhoneLabel}</label>
                    <input type="text" placeholder="9876543210" value={bookingPhone} onChange={(e) => setBookingPhone(e.target.value)} style={{ width: '100%' }} required />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t.marketBookAddressLabel}</label>
                    <input type="text" placeholder="Sherpur Village, Sector 4" value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} style={{ width: '100%' }} required />
                  </div>

                  <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span>{t.marketBookCostLabel}:</span>
                    <strong style={{ color: 'var(--primary-deep)' }}>INR {bookingCost}</strong>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>
                    {t.marketSubmitBooking}
                  </button>
                </form>
              </div>

              {/* Bookings List */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: '1rem', fontWeight: 800 }}>{t.marketActiveBookingsTitle}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bookings.map((b, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--border-gov)', padding: '8px 12px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                        <span style={{ textTransform: 'capitalize' }}>{b.machinery_type.replace('_', ' ')}</span>
                        <span style={{ color: b.status === 'scheduled' ? 'var(--primary-emerald)' : 'var(--accent-orange)' }}>{b.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span>Date: {b.booking_date}</span>
                        <span>INR {b.cost_amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- LOGISTICS & ESCROWS TAB --- */}
          {marketSubTab === 'logistics' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }} className="grid-2">
              
              {/* Escrow System */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: '1rem', fontWeight: 800 }}>{t.marketEscrowsTitle}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {escrows.map((e, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--border-gov)', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                        <span>{e.crop_type} ({e.quantity_metric_tons} MT)</span>
                        <span style={{ color: e.status === 'locked' ? 'var(--tech-blue)' : 'var(--primary-emerald)' }}>{e.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span>{t.marketBuyerLabel}: {e.buyer_name}</span>
                        <span>{t.marketEscrowAmount}: INR {e.escrow_amount}</span>
                      </div>
                      
                      {e.status === 'locked' && (
                        <div style={{ marginTop: '8px', borderTop: '1px dashed var(--border-gov)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Quality params locked. Dispatch logistics node?</span>
                          <button 
                            onClick={() => onDispatchColdStorage(e.id, 'Sherpur Cold Hub')}
                            className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.65rem' }}
                          >
                            Dispatch Cold chain
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cold storage logs */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: '1rem', fontWeight: 800 }}>{t.marketLogisticsTitle}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {logisticsList.map((log, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--border-gov)', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.78rem', display: 'block' }}>{log.store_name}</strong>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t.marketLogisticsRoute}: {log.route} | {t.marketLogisticsTemp}: {log.temp}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', background: 'var(--primary-mint)', color: 'var(--primary-emerald)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- ADMIN TAB --- */}
          {marketSubTab === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Admin Header */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f8fafc', border: 'none', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px', color: '#ffffff' }}>🛡️ Admin Moderation Center</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Review, verify &amp; authorize crop supplements submitted by regional farmers.</p>
                  </div>
                  <div style={{ background: '#fbbf24', color: '#0f172a', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    {pendingListings.length} Requests Awaiting
                  </div>
                </div>
              </div>

              {/* Pending Listings */}
              {pendingListings.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', background: '#ffffff', borderRadius: '12px' }}>
                  <CheckCircle size={44} style={{ color: 'var(--primary-emerald)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-deep)' }}>Approval Queue Clear</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>There are no pending fertilizer or supplement listings awaiting moderation.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingListings.map((item, idx) => (
                    <div key={item.id || idx} className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid #fbbf24', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(251,191,36,0.06)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
                        
                        {/* Image preview box */}
                        <div style={{ width: '180px', minHeight: '180px', flexShrink: 0, background: '#f8fafc', overflow: 'hidden', borderRight: '1px solid var(--border-gov)', position: 'relative' }}>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fef3c7' }}>
                              <ImageIcon size={32} style={{ color: '#f59e0b', marginBottom: '4px' }} />
                              <span style={{ fontSize: '0.62rem', color: '#b45309', fontWeight: 700 }}>IMAGE MOCK</span>
                            </div>
                          )}
                        </div>

                        {/* Details layout */}
                        <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '300px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                            <div>
                              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-deep)', marginBottom: '4px' }}>{item.name}</h4>
                              <span style={{ fontSize: '0.68rem', background: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: '20px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> Verification Pending
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Farmer Price</span>
                              <strong style={{ fontSize: '1.1rem', color: '#166534' }}>₹{item.price}</strong>
                            </div>
                          </div>

                          {/* Spec Grid */}
                          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px 12px', border: '1px solid #f1f5f9' }}>
                            <span>👤 <strong>Seller:</strong> {item.seller_name || item.seller}</span>
                            <span>📞 <strong>Phone:</strong> {item.seller_phone || 'N/A'}</span>
                            <span>✉️ <strong>Email:</strong> {item.seller_email || 'N/A'}</span>
                            <span>🧪 <strong>NPK:</strong> {item.npk_ratio || 'N/A'}</span>
                            <span>📦 <strong>Pack:</strong> {item.weight || '50kg'}</span>
                            <span>📊 <strong>Stock:</strong> {item.stock || '10'} units</span>
                            <span>🏷️ <strong>Category:</strong> {item.category || 'General'}</span>
                          </div>

                          {item.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-body)', background: '#fffbeb', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                              <strong>Farmer Description:</strong> "{item.description}"
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                              onClick={() => onApproveListing(item.id)}
                              className="btn btn-primary"
                              style={{ padding: '6px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#166534', borderColor: '#166534', borderRadius: '8px', fontWeight: 700 }}
                            >
                              <CheckCircle size={14} /> Approve &amp; Publish Live
                            </button>
                            <button
                              onClick={() => onRejectListing(item.id)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', borderColor: '#fca5a5', borderRadius: '8px' }}
                            >
                              <XCircle size={14} /> Reject Request
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* System Stats (existing admin data) */}
              {adminData && (
                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.92rem', marginBottom: '1rem', fontWeight: 800 }}>{t.marketAdminTitle}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Database Connection</span>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--primary-emerald)' }}>{adminData.database_status}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Farms Registered</span>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>{adminData.total_farms}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Supabase Auth Users</span>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>{adminData.total_users}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sidebar Cart Drawer (E-commerce Style - side by side checkouts) */}
        {isCartOpen && marketSubTab === 'shop' && (
          <div 
            className="glass-panel animate-fade-right" 
            style={{ 
              width: '320px', 
              background: '#ffffff', 
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid var(--border-gov)',
              alignSelf: 'flex-start',
              position: 'sticky',
              top: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: 'var(--primary-deep)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingCart size={16} />
                {t.marketCartTitle}
              </h4>
              <button 
                onClick={() => setIsCartOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
            
            {/* Cart Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.78rem' }}>{t.marketCartEmpty}</p>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.78rem', borderBottom: '1px solid #f8fafc', paddingBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: 'var(--text-dark)', display: 'block' }}>{item.name}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Qty: {item.qty} x ₹{item.price}
                      </span>
                    </div>
                    <strong style={{ color: '#166534' }}>₹{item.price * item.qty}</strong>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid var(--border-gov)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800 }}>
                  <span>Subtotal:</span>
                  <span style={{ color: '#166534' }}>₹{cartItems.reduce((acc, i) => acc + (i.price * i.qty), 0)}</span>
                </div>

                <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: '6px', fontSize: '0.7rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} />
                  <span>Free doorstep village transport active.</span>
                </div>

                <button 
                  onClick={onCheckout} 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 800,
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    background: 'var(--primary-emerald)',
                    borderColor: 'var(--primary-emerald)'
                  }}
                  disabled={cartItems.length === 0 || razorpayLoading}
                >
                  {razorpayLoading ? 'Processing Checkout...' : t.marketCheckout}
                </button>
              </>
            )}
          </div>
        )}

      </div>

      {/* Sell Modal pop-up Overlay - Enhanced with full seller info */}
      {isSellModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)'
        }}>
          <div className="glass-panel animate-scale-up" style={{ background: '#ffffff', width: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-gov)', paddingBottom: '0.75rem' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-deep)' }}>List Crop Supplement / Fertilizer</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>List your self-fertilizer or commercial supplements for regional trading.</p>
              </div>
              <button onClick={() => setIsSellModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span><strong>Note:</strong> Listings go to the central moderator review ledger. It goes live upon Jayesh's verification.</span>
            </div>
            
            <form onSubmit={handleSellFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Product Info Section */}
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                Product Details
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Product Name *</label>
                  <input type="text" placeholder="e.g. Bio-Humic Compost Blend" value={sellFertName} onChange={(e) => setSellFertName(e.target.value)} style={{ width: '100%', borderRadius: '8px' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>NPK Ratio (Optional)</label>
                  <input type="text" placeholder="e.g. 12-32-16" value={sellFertNpk} onChange={(e) => setSellFertNpk(e.target.value)} style={{ width: '100%', borderRadius: '8px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Price (INR ₹) *</label>
                  <input type="number" placeholder="e.g. 450" value={sellFertPrice} onChange={(e) => setSellFertPrice(e.target.value)} style={{ width: '100%', borderRadius: '8px' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Weight (e.g. 50kg, 1L) *</label>
                  <input type="text" placeholder="e.g. 40kg Bag" value={sellWeight} onChange={(e) => setSellWeight(e.target.value)} style={{ width: '100%', borderRadius: '8px' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Stock Quantity *</label>
                  <input type="number" placeholder="10" value={sellStock} onChange={(e) => setSellStock(e.target.value)} style={{ width: '100%', borderRadius: '8px' }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Category *</label>
                  <select value={sellCategory} onChange={(e) => setSellCategory(e.target.value)} style={{ width: '100%', borderRadius: '8px' }}>
                    <option value="Organic">Organic</option>
                    <option value="Nitrogenous">Nitrogenous</option>
                    <option value="Phosphatic">Phosphatic</option>
                    <option value="Potassic">Potassic</option>
                    <option value="Micronutrient">Micronutrient</option>
                    <option value="Bio-Fertilizer">Bio-Fertilizer</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Image URL *</label>
                  <input type="url" placeholder="https://images.unsplash.com/photo-..." value={sellImageUrl} onChange={(e) => setSellImageUrl(e.target.value)} style={{ width: '100%', borderRadius: '8px' }} required />
                </div>
              </div>

              {/* Image Preview Box */}
              {sellImageUrl && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', height: '110px', background: '#f8fafc', border: '1px dashed var(--border-gov)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={sellImageUrl} alt="Product Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=300'; }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Item Description *</label>
                <textarea placeholder="Describe the composition, recommended usage and soil benefits..." value={sellDescription} onChange={(e) => setSellDescription(e.target.value)} rows={3} style={{ width: '100%', resize: 'none', fontFamily: 'inherit', fontSize: '0.8rem', padding: '8px 12px', border: '1px solid var(--border-gov)', borderRadius: '8px' }} required />
              </div>

              {/* Seller Info Section */}
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginTop: '4px' }}>
                Seller Information
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Your Contact Phone *</label>
                  <input type="tel" placeholder="9876543210" value={sellSellerPhone} onChange={(e) => setSellSellerPhone(e.target.value)} style={{ width: '100%', borderRadius: '8px' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>Your Email address *</label>
                  <input type="email" placeholder="farmer@village.com" value={sellSellerEmail} onChange={(e) => setSellSellerEmail(e.target.value)} style={{ width: '100%', borderRadius: '8px' }} required />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '6px', fontSize: '0.85rem', fontWeight: 800, borderRadius: '8px', background: 'var(--primary-emerald)', borderColor: 'var(--primary-emerald)' }}>
                Submit For Verification
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Popup (E-Commerce style info modal) */}
      {selectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)'
        }} onClick={() => setSelectedProduct(null)}>
          <div className="glass-panel animate-scale-up" style={{ background: '#ffffff', width: '460px', padding: '0', overflow: 'hidden', borderRadius: '16px' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Main Product Image header */}
            <div style={{ position: 'relative', width: '100%', height: '210px', background: '#f8fafc' }}>
              {!imageErrors[selectedProduct.id] && selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => handleImageError(selectedProduct.id)} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #ecfdf5, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={48} style={{ color: '#86efac' }} />
                </div>
              )}
              
              {/* Category tag */}
              <span 
                style={{ 
                  position: 'absolute', top: '12px', left: '12px', fontSize: '0.7rem', 
                  background: 'var(--primary-deep)', color: '#ffffff', padding: '4px 10px', 
                  borderRadius: '20px', fontWeight: 800 
                }}
              >
                {selectedProduct.category || 'Agricultural'}
              </span>

              {/* Dismiss button */}
              <button 
                onClick={() => setSelectedProduct(null)} 
                style={{ 
                  position: 'absolute', top: '12px', right: '12px', 
                  background: 'rgba(255,255,255,0.85)', border: 'none', 
                  width: '28px', height: '28px', borderRadius: '50%', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' 
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-deep)', margin: 0 }}>
                  {selectedProduct.name}
                </h3>
                {selectedProduct.brand && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Brand: <strong>{selectedProduct.brand}</strong>
                  </span>
                )}
              </div>

              {/* Spec tag pills grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #f1f5f9' }}>
                <span>🧪 <strong>NPK Ratio:</strong> {selectedProduct.npk_ratio || 'N/A'}</span>
                <span>📦 <strong>Pack Weight:</strong> {selectedProduct.weight || '50kg'}</span>
                <span>📊 <strong>Stock Left:</strong> {selectedProduct.stock} units</span>
                <span>🏷️ <strong>Category:</strong> {selectedProduct.category || 'General'}</span>
              </div>

              {/* Seller details contact info */}
              <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #dcfce7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#166534', fontWeight: 800 }}>
                  <UserIcon size={14} />
                  <span>Verified Regional Seller</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#14532d' }}>
                  <span><strong>Seller Name:</strong> {selectedProduct.seller_name || selectedProduct.seller}</span>
                  <span><strong>Contact Tel:</strong> {selectedProduct.seller_phone || 'N/A'}</span>
                  <span><strong>Email address:</strong> {selectedProduct.seller_email || 'N/A'}</span>
                </div>
              </div>

              {selectedProduct.description && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Info size={16} style={{ color: 'var(--primary-emerald)', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', lineHeight: '1.4', margin: 0 }}>
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* Price and checkout row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '4px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Best Market Price</span>
                  <strong style={{ fontSize: '1.3rem', color: '#166534' }}>
                    ₹{selectedProduct.price}
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => {
                      onAddToCart(selectedProduct);
                      setSelectedProduct(null);
                    }} 
                    className="btn btn-primary" 
                    style={{ 
                      padding: '8px 22px', 
                      fontSize: '0.82rem', 
                      fontWeight: 800, 
                      borderRadius: '8px',
                      background: 'var(--primary-emerald)',
                      borderColor: 'var(--primary-emerald)'
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MarketPage;
