import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AdminPage from './Admin';
import { Search, ShoppingBag, Menu, X, Heart, ArrowUpRight, Crown, Shirt, Baby, Sparkles, Plus, Minus, Trash2 } from 'lucide-react';
type Category = 'Tout' | 'Femmes' | 'Hommes' | 'Enfants';
type Product = {id:string;name:string;category:string;price:number;oldPrice?:number;label?:string;image:string};
type DbProduct = {id:string|number;name:string;price:number|string;compare_at_price:number|string|null;image_url:string|null;category_id:string|null;is_active:boolean;stock_quantity?:number};
type DbCategory = {id:string;name:string};
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const money=(n:number)=>`${n.toLocaleString('fr-MA')} DH`;
// بدّل هاد الرقم برقم واتساب ديالك بصيغة دولية بلا + ولا مسافات.
const WHATSAPP_NUMBER = '212XXXXXXXXX';
export default function App(){
if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') return <AdminPage />;
const [category,setCategory]=useState<Category>('Tout'),[search,setSearch]=useState(''),[cart,setCart]=useState<Record<string,number>>({}),[cartOpen,setCartOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[favorites,setFavorites]=useState<string[]>([]),[notice,setNotice]=useState('');
const [products,setProducts]=useState<Product[]>([]),[productsLoading,setProductsLoading]=useState(true),[productsError,setProductsError]=useState('');
useEffect(()=>{
  let cancelled=false;
  async function loadProducts(){
    if(!db){setProductsError('خاص إعداد VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY فـ Vercel باش يبانوا المنتجات.');setProductsLoading(false);return;}
    const [productResult,categoryResult]=await Promise.all([
      db.from('products').select('id,name,price,compare_at_price,image_url,category_id,is_active,stock_quantity').eq('is_active',true).order('created_at',{ascending:false}),
      db.from('categories').select('id,name')
    ]);
    if(cancelled)return;
    if(productResult.error){setProductsError('تعذر تحميل المنتجات: '+productResult.error.message);setProductsLoading(false);return;}
    const categoryNames=new Map<string,string>(((categoryResult.data??[]) as DbCategory[]).map(c=>[c.id,c.name]));
    const mapped=((productResult.data??[]) as DbProduct[]).filter(p=>p.is_active).map(p=>{
      const rawCategory=p.category_id?categoryNames.get(p.category_id)??'':'';
      const normalized=rawCategory.toLowerCase();
      const displayCategory=normalized.includes('femme')||normalized.includes('نساء')?'Femmes':normalized.includes('enfant')||normalized.includes('أطفال')?'Enfants':normalized.includes('homme')||normalized.includes('رجال')?'Hommes':rawCategory||'Autres';
      const price=Number(p.price)||0;
      const oldPrice=p.compare_at_price==null?undefined:Number(p.compare_at_price);
      return {id:String(p.id),name:p.name,category:displayCategory,price,oldPrice,image:p.image_url||'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',label:oldPrice&&oldPrice>price?'PROMOTION':undefined} as Product;
    });
    setProducts(mapped);setProductsLoading(false);
  }
  void loadProducts();
  return ()=>{cancelled=true};
},[]);
const [customerName,setCustomerName]=useState(''),[customerPhone,setCustomerPhone]=useState(''),[customerCity,setCustomerCity]=useState(''),[customerAddress,setCustomerAddress]=useState('');
const visible=useMemo(()=>products.filter(p=>(category==='Tout'||p.category===category)&&p.name.toLowerCase().includes(search.toLowerCase())),[products,category,search]);
const cartItems=products.filter(p=>cart[p.id]),cartCount=Object.values(cart).reduce((s,n)=>s+n,0),cartTotal=cartItems.reduce((s,p)=>s+p.price*cart[p.id],0);
function selectCategory(c:Category){setCategory(c);setMenuOpen(false);document.getElementById('collection')?.scrollIntoView({behavior:'smooth'});}
function add(id:string){setCart(c=>({...c,[id]:(c[id]||0)+1}));setNotice('Produit ajouté au panier');window.setTimeout(()=>setNotice(''),2200)}
function qty(id:string,d:number){setCart(c=>{const n={...c,[id]:(c[id]||0)+d};if(n[id]<=0)delete n[id];return n})}
function orderWhatsApp(){
  if(cartItems.length===0){setNotice('السلة ديالك خاوية');return;}
  if(!customerName.trim()||!customerPhone.trim()||!customerCity.trim()||!customerAddress.trim()){
    setNotice('عافاك عمر جميع معلومات التوصيل');
    return;
  }
  if(WHATSAPP_NUMBER==='212XXXXXXXXX'){
    setNotice('بدّل رقم واتساب في الكود قبل استقبال الطلبات');
    return;
  }
  const orderLines=cartItems.map(p=>`- ${p.name} | الكمية: ${cart[p.id]} | الثمن: ${money(p.price*cart[p.id])}`).join('\n');
  const message=`🛍️ طلب جديد من LioShop.ma\n\nالمنتجات:\n${orderLines}\n\nالمجموع: ${money(cartTotal)}\n\nمعلومات الزبون:\nالاسم: ${customerName}\nالهاتف: ${customerPhone}\nالمدينة: ${customerCity}\nالعنوان: ${customerAddress}\n\nالمرجو تأكيد الطلب ومصاريف التوصيل.`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
}
return <div className="site-shell"><div className="announcement">LIVRAISON PARTOUT AU MAROC <span>✦</span> NOUVELLE COLLECTION DISPONIBLE</div>
<header className="header"><button className="icon-button mobile-menu" aria-label="Ouvrir le menu" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={21}/>:<Menu size={21}/>}</button><a className="brand" href="#"><span className="brand-mark"><Crown size={19}/></span><span className="brand-name">Lio<span>Shop</span></span></a>
<nav className={`nav ${menuOpen?'nav-open':''}`}><button onClick={()=>selectCategory('Tout')}>Accueil</button><button onClick={()=>selectCategory('Femmes')}>Femmes</button><button onClick={()=>selectCategory('Hommes')}>Hommes</button><button onClick={()=>selectCategory('Enfants')}>Enfants</button><a href="#collection" onClick={()=>setMenuOpen(false)}>Nos nouveautés <span className="nav-dot"/></a></nav>
<div className="header-actions"><label className="search-box"><Search size={17}/><input aria-label="Rechercher un produit" placeholder="Rechercher..." value={search} onChange={e=>{setSearch(e.target.value);document.getElementById('collection')?.scrollIntoView({behavior:'smooth'})}}/></label><button className="icon-button bag-button" aria-label="Ouvrir le panier" onClick={()=>setCartOpen(true)}><ShoppingBag size={21}/><span className="cart-count">{cartCount}</span></button></div></header>
<main><section className="hero"><div className="hero-image"/><div className="hero-shade"/><div className="hero-content"><div className="eyebrow"><span className="eyebrow-line"/> STYLE. QUALITÉ. ATTITUDE.</div><h1>Votre style.<br/><em>Votre signature.</em></h1><p>Découvrez une mode pensée pour vous. Des pièces incontournables pour toutes les générations, à prix accessibles.</p><button className="gold-button" onClick={()=>selectCategory('Tout')}>DÉCOUVRIR LA COLLECTION <ArrowUpRight size={17}/></button><div className="hero-note"><span className="note-line"/> LA MODE POUR TOUS, SANS COMPROMIS</div></div><div className="hero-badge"><Sparkles size={18}/><span>COLLECTION<br/><b>2026</b></span></div><div className="hero-index">01 <span/> 03</div></section>
<section className="category-strip"><button onClick={()=>selectCategory('Femmes')} className="category-card"><span className="category-icon"><Sparkles size={23}/></span><span><b>Pour elle</b><small>Élégance au quotidien</small></span><ArrowUpRight size={19} className="category-arrow"/></button><button onClick={()=>selectCategory('Hommes')} className="category-card"><span className="category-icon"><Shirt size={23}/></span><span><b>Pour lui</b><small>Un style affirmé</small></span><ArrowUpRight size={19} className="category-arrow"/></button><button onClick={()=>selectCategory('Enfants')} className="category-card"><span className="category-icon"><Baby size={23}/></span><span><b>Pour les petits</b><small>Le confort avant tout</small></span><ArrowUpRight size={19} className="category-arrow"/></button></section>
<section className="collection section-wrap" id="collection"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> SÉLECTION LIO</div><h2>Les pièces <em>du moment</em></h2></div><p>Des essentiels soigneusement sélectionnés<br/>pour composer votre propre style.</p></div><div className="filters">{(['Tout','Femmes','Hommes','Enfants'] as Category[]).map(c=><button key={c} onClick={()=>setCategory(c)} className={category===c?'filter active':'filter'}>{c}</button>)}<span className="result-count">{visible.length} ARTICLES</span></div>
<div className="product-grid">{productsLoading?<div className="empty-state">كنحمّلو المنتجات...</div>:productsError?<div className="empty-state">{productsError}</div>:visible.map(p=><article className="product-card" key={p.id}><div className="product-image-wrap"><img src={p.image} alt={p.name} loading="lazy"/>{p.label&&<span className="product-label">{p.label}</span>}<button className={`favorite ${favorites.includes(p.id)?'favorite-active':''}`} aria-label="Ajouter aux favoris" onClick={()=>setFavorites(f=>f.includes(p.id)?f.filter(x=>x!==p.id):[...f,p.id])}><Heart size={18} fill={favorites.includes(p.id)?'currentColor':'none'}/></button><button className="quick-add" onClick={()=>add(p.id)}><Plus size={16}/> AJOUTER AU PANIER</button></div><div className="product-meta"><span>{p.category}</span><span className="product-stars">★★★★★</span></div><h3>{p.name}</h3><div className="price-row"><b>{money(p.price)}</b>{p.oldPrice&&<del>{money(p.oldPrice)}</del>}</div></article>)}{!productsLoading&&!productsError&&visible.length===0&&<div className="empty-state">Aucun produit trouvé. Essayez une autre recherche.</div>}</div><button className="outline-button" onClick={()=>{setCategory('Tout');setSearch('')}}>VOIR TOUTE LA COLLECTION <ArrowUpRight size={16}/></button></section>
<section className="promise"><div className="promise-item"><span>01</span><div><b>Style pour tous</b><p>Des collections pour toute la famille.</p></div></div><div className="promise-item"><span>02</span><div><b>Prix accessibles</b><p>Le style qui respecte votre budget.</p></div></div><div className="promise-item"><span>03</span><div><b>Livraison au Maroc</b><p>Votre commande, où que vous soyez.</p></div></div></section>
<section className="newsletter"><div className="newsletter-mark"><Crown size={25}/></div><div><div className="eyebrow">REJOIGNEZ LE CLUB LIO</div><h2>Un peu plus de style<br/><em>dans votre boîte mail.</em></h2></div><form onSubmit={e=>{e.preventDefault();setNotice('Merci ! Vous êtes inscrit(e) à la newsletter.');window.setTimeout(()=>setNotice(''),2500)}}><label htmlFor="email">Recevez nos nouveautés et offres exclusives.</label><div className="email-field"><input id="email" type="email" placeholder="Votre adresse e-mail" required/><button type="submit" aria-label="S'inscrire"><ArrowUpRight size={20}/></button></div><small>En vous inscrivant, vous acceptez de recevoir nos actualités.</small></form></section></main>
<footer className="footer"><a className="brand footer-brand" href="#"><span className="brand-mark"><Crown size={19}/></span><span className="brand-name">Lio<span>Shop</span></span></a><p>FASHION FOR EVERYONE.</p><div className="footer-links"><a href="#collection">Collection</a><a href="#collection">Livraison & retours</a><a href="#collection">Contact</a><a className="admin-entry" href="/admin" aria-label="Accéder à l’administration">Admin <ArrowUpRight size={13}/></a></div><span className="copyright">© 2026 LioShop. Tous droits réservés.</span></footer>
{notice&&<div className="toast"><Sparkles size={16}/>{notice}</div>}{cartOpen&&<div className="drawer-backdrop" onClick={()=>setCartOpen(false)}><aside className="cart-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">VOTRE SÉLECTION</span><h2>Mon panier <span>({cartCount})</span></h2></div><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="Fermer le panier"><X size={22}/></button></div>{cartItems.length===0?<div className="cart-empty"><ShoppingBag size={35}/><h3>Votre panier est vide</h3><p>Ajoutez vos pièces préférées pour les retrouver ici.</p><button className="gold-button" onClick={()=>{setCartOpen(false);selectCategory('Tout')}}>DÉCOUVRIR LA COLLECTION</button></div>:<><div className="cart-lines">{cartItems.map(p=><div className="cart-line" key={p.id}><img src={p.image} alt={p.name}/><div className="cart-line-info"><b>{p.name}</b><span>{money(p.price)}</span><div className="quantity"><button onClick={()=>qty(p.id,-1)} aria-label="Diminuer"><Minus size={13}/></button><span>{cart[p.id]}</span><button onClick={()=>qty(p.id,1)} aria-label="Augmenter"><Plus size={13}/></button></div></div><button className="remove-item" onClick={()=>setCart(c=>{const n={...c};delete n[p.id];return n})} aria-label="Supprimer"><Trash2 size={16}/></button></div>)}</div><div className="cart-bottom"><div className="subtotal"><span>Sous-total</span><b>{money(cartTotal)}</b></div><p>Les frais de livraison seront confirmés lors de la commande.</p><div className="whatsapp-checkout" style={{display:'grid',gap:10,marginTop:14}}>
<label style={{display:'grid',gap:5}}>الاسم الكامل<input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="الاسم الكامل" required style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box'}} /></label>
<label style={{display:'grid',gap:5}}>رقم الهاتف<input type="tel" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="06XXXXXXXX" required style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box'}} /></label>
<label style={{display:'grid',gap:5}}>المدينة<input value={customerCity} onChange={e=>setCustomerCity(e.target.value)} placeholder="المدينة" required style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box'}} /></label>
<label style={{display:'grid',gap:5}}>العنوان بالتفصيل<textarea value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} placeholder="العنوان بالتفصيل" required rows={3} style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box',resize:'vertical'}} /></label>
<button type="button" className="gold-button checkout" onClick={orderWhatsApp} style={{background:'#25D366',color:'#fff'}}>🟢 تأكيد الطلب عبر واتساب <ArrowUpRight size={17}/></button>
</div></div></>}</aside></div>}</div>}
