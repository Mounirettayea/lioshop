import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AdminPage from './Admin';
import logo from './logo.png';
import heroBanner from './lioshop-hero-banner.png';
import { Search, ShoppingBag, Menu, X, Heart, ArrowUpRight, Crown, Sparkles, Plus, Minus, Trash2 } from 'lucide-react';
type Category = 'Tout' | 'نسائي' | 'رجالي' | 'أطفال' | 'Femmes' | 'Hommes' | 'Enfants';
type Product = {id:string;name:string;source?:string;category:string;price:number;oldPrice?:number;label?:string;image:string;images:string[];video?:string;description:string;sizes:string[];colors:string[];isNewArrival?:boolean;isBestSeller?:boolean;isPromotion?:boolean};
type DbProduct = {id:string|number;name:string;description?:string|null;source?:string|null;price:number|string;compare_at_price:number|string|null;image_url:string|null;image_urls?:string[]|null;images?:string[]|null;video_url?:string|null;sizes?:string[]|null;colors?:string[]|null;category_id:string|null;is_active:boolean;stock_quantity?:number;is_new_arrival:boolean;is_best_seller:boolean;is_promotion:boolean};
type DbCategory = {id:string;name:string};
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const money=(n:number)=>`${n.toLocaleString('fr-MA')} DH`;
// بدّل هاد الرقم برقم واتساب ديالك بصيغة دولية بلا + ولا مسافات.
const WHATSAPP_NUMBER: string = '212681999212';
export default function App(){
if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') return <AdminPage />;
const [category,setCategory]=useState<Category>('Tout'),[search,setSearch]=useState(''),[cart,setCart]=useState<Record<string,number>>({}),[cartColors,setCartColors]=useState<Record<string,string>>({}),[cartOpen,setCartOpen]=useState(false),[checkoutOpen,setCheckoutOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[favorites,setFavorites]=useState<string[]>([]),[notice,setNotice]=useState('');
const [products,setProducts]=useState<Product[]>([]),[productsLoading,setProductsLoading]=useState(true),[productsError,setProductsError]=useState('');
useEffect(()=>{
  let cancelled=false;
  async function loadProducts(){
    if(!db){setProductsError('خاص إعداد VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY فـ Vercel باش يبانوا المنتجات.');setProductsLoading(false);return;}
    const [productResult,categoryResult]=await Promise.all([
      db.from('products').select('id,name,description,source,price,compare_at_price,image_url,image_urls,images,video_url,sizes,colors,category_id,is_active,stock_quantity,is_new_arrival,is_best_seller,is_promotion').eq('is_active',true).order('created_at',{ascending:false}),
      db.from('categories').select('id,name')
    ]);
    if(cancelled)return;
    if(productResult.error){setProductsError('تعذر تحميل المنتجات: '+productResult.error.message);setProductsLoading(false);return;}
    const categoryNames=new Map<string,string>(((categoryResult.data??[]) as DbCategory[]).map(c=>[c.id,c.name]));
    const mapped=((productResult.data??[]) as DbProduct[]).filter(p=>p.is_active).map(p=>{
      const rawCategory=p.category_id?categoryNames.get(p.category_id)??'':'';
      const normalized=rawCategory.toLowerCase();
      const displayCategory=normalized.includes('femme')||normalized.includes('نساء')||normalized.includes('نسائ')?'نسائي':normalized.includes('enfant')||normalized.includes('أطفال')?'أطفال':normalized.includes('homme')||normalized.includes('رجال')?'رجالي':rawCategory||'Autres';
      const price=Number(p.price)||0;
      const oldPrice=p.compare_at_price==null?undefined:Number(p.compare_at_price);
      const gallery=(p.image_urls?.length?p.image_urls:p.images?.length?p.images:p.image_url?[p.image_url]:[]).filter(Boolean);
      const fallback='https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80';
      return {id:String(p.id),name:p.name,source:p.source||'',description:p.description||'',category:displayCategory,price,oldPrice,images:gallery,image:gallery[0]||p.image_url||fallback,video:p.video_url||undefined,sizes:p.sizes||[],colors:p.colors||[],label:(p.is_promotion||(oldPrice!==undefined&&oldPrice>price))?'PROMOTION':p.is_new_arrival?'NOUVEAUTÉ':p.is_best_seller?'BEST-SELLER':undefined,isNewArrival:p.is_new_arrival,isBestSeller:p.is_best_seller,isPromotion:p.is_promotion} as Product;
    });
    setProducts(mapped);setProductsLoading(false);
  }
  void loadProducts();
  return ()=>{cancelled=true};
},[]);
const [customerName,setCustomerName]=useState(''),[customerPhone,setCustomerPhone]=useState(''),[customerEmail,setCustomerEmail]=useState(''),[customerCity,setCustomerCity]=useState(''),[customerAddress,setCustomerAddress]=useState('');
const [selectedSize,setSelectedSize]=useState(''),[selectedColor,setSelectedColor]=useState(''),[orderQuantity,setOrderQuantity]=useState(1),[orderSuccess,setOrderSuccess]=useState(''),[detailImage,setDetailImage]=useState(''),[detailVideoActive,setDetailVideoActive]=useState(false);
const detailId=new URLSearchParams(window.location.search).get('product');
const detailProduct=detailId?products.find(p=>p.id===detailId):undefined;
const visible=useMemo(()=>products.filter(p=>(category==='Tout'||p.category===category)&&p.name.toLowerCase().includes(search.toLowerCase())),[products,category,search]);
const cartItems=products.filter(p=>cart[p.id]),cartCount=Object.values(cart).reduce((s,n)=>s+n,0),cartTotal=cartItems.reduce((s,p)=>s+p.price*cart[p.id],0);
function selectCategory(c:Category){const normalized:Category=c==='Femmes'?'نسائي':c==='Hommes'?'رجالي':c==='Enfants'?'أطفال':c;setCategory(normalized);setMenuOpen(false);document.getElementById('collection')?.scrollIntoView({behavior:'smooth'});}
function qty(id:string,d:number){setCart(c=>{const n={...c,[id]:(c[id]||0)+d};if(n[id]<=0){delete n[id];setCartColors(colors=>{const next={...colors};delete next[id];return next})}return n})}
function colorCss(value:string){const v=value.trim().toLowerCase();if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v))return v;const map:Record<string,string>={'noir':'#171717','black':'#171717','noire':'#171717','أسود':'#171717','اسود':'#171717','blanc':'#ffffff','white':'#ffffff','أبيض':'#ffffff','ابيض':'#ffffff','beige':'#d8c5a5','بيج':'#d8c5a5','gris':'#929292','gray':'#929292','grey':'#929292','رمادي':'#929292','rouge':'#b32635','red':'#c62828','أحمر':'#c62828','احمر':'#c62828','bordeaux':'#741b2b','burgundy':'#741b2b','maroon':'#741b2b','bleu':'#2456a6','blue':'#2456a6','أزرق':'#2456a6','ازرق':'#2456a6','navy':'#172b4d','vert':'#27834a','green':'#27834a','أخضر':'#27834a','اخضر':'#27834a','jaune':'#f2d33d','yellow':'#f2d33d','أصفر':'#f2d33d','اصفر':'#f2d33d','rose':'#e7a3b5','pink':'#e7a3b5','marron':'#795548','brown':'#795548','بني':'#795548','orange':'#ed8b23','violet':'#7546a5','purple':'#7546a5'};return map[v]||'#c9c2b8';}
function openProduct(id:string){window.location.href='/?product='+encodeURIComponent(id)}
function orderDirect(product:Product){
  if(!customerName.trim()||!customerPhone.trim()||!customerCity.trim()||!customerAddress.trim()){setNotice('عافاك عمر معلومات التوصيل كاملة');return;}
  if(!/^\d{10,15}$/.test(WHATSAPP_NUMBER)){setNotice('رقم واتساب غير صالح، راجع إعدادات المتجر');return;}
  const message=`🛍️ طلب جديد من LioShop.ma

المنتج: ${product.name}
الثمن: ${money(product.price)}
الكمية: ${orderQuantity}
المقاس: ${selectedSize||product.sizes[0]||'غير محدد'}
اللون: ${selectedColor||product.colors[0]||'غير محدد'}
المجموع: ${money(product.price*orderQuantity)}

معلومات الزبون:
الاسم: ${customerName.trim()}
الهاتف: ${customerPhone.trim()}
المدينة: ${customerCity.trim()}
العنوان: ${customerAddress.trim()}

المرجو تأكيد الطلب ومصاريف التوصيل.`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
  setOrderSuccess('تفتح واتساب برسالة الطلب. ضغط على إرسال باش يوصلنا الطلب.');
}
function orderWhatsApp(){
  if(cartItems.length===0){setNotice('السلة ديالك خاوية');return;}
  if(!customerName.trim()||!customerPhone.trim()||!customerCity.trim()||!customerAddress.trim()){
    setNotice('عافاك عمر الاسم ورقم الهاتف والمدينة والعنوان');
    return;
  }
  if(!/^\+?\d{8,15}$/.test(customerPhone.replace(/[\s()-]/g,''))){
    setNotice('دخل رقم هاتف صحيح');
    return;
  }
  if(!/^\d{10,15}$/.test(WHATSAPP_NUMBER)){
    setNotice('رقم واتساب المتجر غير صالح');
    return;
  }
  const orderLines=cartItems.map(p=>`- ${p.name} | الكمية: ${cart[p.id]} | اللون: ${cartColors[p.id]||p.colors[0]||'غير محدد'} | الثمن: ${money(p.price*cart[p.id])}\n  المصدر: ${p.source?.trim()||'غير محدد'}`).join('\n');
  const message=`🛍️ طلب جديد من LioShop.ma\n\nالمنتجات:\n${orderLines}\n\nالمجموع: ${money(cartTotal)}\n\nمعلومات الزبون:\nالاسم: ${customerName.trim()}\nالهاتف: ${customerPhone.trim()}\nالبريد الإلكتروني: ${customerEmail.trim()||'غير متوفر'}\nالمدينة: ${customerCity.trim()}\nالعنوان: ${customerAddress.trim()}\n\nالمرجو تأكيد الطلب ومصاريف التوصيل.`;
  const whatsappUrl=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.location.href=whatsappUrl;
}

if(detailId){
  if(productsLoading)return <div className="site-shell"><div className="detail-loading">كنحمّلو تفاصيل المنتج...</div></div>;
  if(!detailProduct)return <div className="site-shell"><div className="product-detail-page"><button className="detail-back" onClick={()=>window.location.href='/'}>← الرجوع للمتجر</button><p className="empty-state">{productsError||'هاد المنتج ما لقيناهش أو ما بقاش متوفر.'}</p></div></div>;
  const gallery=detailProduct.images.length?detailProduct.images:[detailProduct.image];
  const activeImage=detailImage&&gallery.includes(detailImage)?detailImage:gallery[0];
  return <div className="site-shell"><header className="detail-header"><button className="detail-back" onClick={()=>window.location.href='/'}>← متابعة التسوق</button><a className="brand" href="/"><img className="brand-logo" src={logo} alt="LioShop — Fashion for everyone" /></a></header><main className="product-detail-page"><div className="detail-breadcrumb">Accueil / {detailProduct.category} / {detailProduct.name}</div><div className="detail-layout"><div className="detail-gallery"><div className="detail-main-image">{detailVideoActive&&detailProduct.video?<video src={detailProduct.video} controls autoPlay playsInline preload="metadata" aria-label={'فيديو '+detailProduct.name}/>:<img src={activeImage} alt={detailProduct.name} />}{detailProduct.label&&<span className="product-label">{detailProduct.label}</span>}</div>{(gallery.length>1||detailProduct.video)&&<div className="detail-thumbnails">{gallery.map((url,i)=><button key={url+i} className={!detailVideoActive&&url===activeImage?'selected':''} onClick={()=>{setDetailVideoActive(false);setDetailImage(url)}} aria-label={'الصورة '+(i+1)}><img src={url} alt={detailProduct.name+' '+(i+1)}/></button>)}{detailProduct.video&&<button className={detailVideoActive?'selected':''} onClick={()=>setDetailVideoActive(true)} aria-label="تشغيل فيديو المنتج"><span className="video-thumb"><img src={gallery[0]||detailProduct.image} alt=""/><span>▶</span></span></button>}</div>}</div><section className="detail-info"><div className="eyebrow"><span className="eyebrow-line"/> LIO SHOP COLLECTION</div><div className="detail-category">{detailProduct.category}</div><h1>{detailProduct.name}</h1><div className="detail-price"><b>{money(detailProduct.price)}</b>{detailProduct.oldPrice&&<del>{money(detailProduct.oldPrice)}</del>}</div>{detailProduct.description&&<p className="detail-description">{detailProduct.description}</p>}<style>{`.cart-color-dot{position:relative;display:inline-flex;align-items:center;justify-content:center}.cart-color-dot.selected{outline:3px solid #7c1428;outline-offset:3px;transform:scale(1.12)}.cart-color-dot.selected:after{content:"✓";display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:16px;font-weight:900;color:#fff;text-shadow:0 1px 3px #000,1px 0 2px #000,-1px 0 2px #000;pointer-events:none}.detail-options{display:grid;gap:18px}.detail-choice{display:grid;gap:9px}.detail-choice>label{font-weight:600}.detail-color-swatches,.detail-size-options{display:flex;flex-wrap:wrap;gap:10px}.detail-color-swatches .cart-color-dot{width:30px;height:30px;min-width:30px}.detail-size{min-width:42px;height:40px;padding:0 12px;border:1px solid #d8d3ca;background:#fff;color:#282828;border-radius:4px;cursor:pointer}.detail-size.selected{border:2px solid #7c1428;background:#7c1428;color:#fff;font-weight:700}`}</style><div className="detail-options">{detailProduct.colors.length>0&&<div className="detail-choice"><label>اللون</label><div className="detail-color-swatches">{detailProduct.colors.map((c,i)=><button type="button" key={c+i} title={c} aria-label={"اختيار اللون "+c} aria-pressed={(selectedColor||detailProduct.colors[0])===c} onClick={()=>setSelectedColor(c)} className={(selectedColor||detailProduct.colors[0])===c?"cart-color-dot selected":"cart-color-dot"} style={{backgroundColor:colorCss(c)}}/>)}</div></div>}{detailProduct.sizes.length>0&&<div className="detail-choice"><label>المقاس</label><div className="detail-size-options">{detailProduct.sizes.map((z,i)=><button type="button" key={z+i} aria-pressed={(selectedSize||detailProduct.sizes[0])===z} onClick={()=>setSelectedSize(z)} className={(selectedSize||detailProduct.sizes[0])===z?"detail-size selected":"detail-size"}>{z}</button>)}</div></div>}<label>الكمية<div className="detail-quantity"><button type="button" onClick={()=>setOrderQuantity(q=>Math.max(1,q-1))}>−</button><span>{orderQuantity}</span><button type="button" onClick={()=>setOrderQuantity(q=>Math.min(20,q+1))}>+</button></div></label></div><div className="detail-order-form"><h2>معلومات التوصيل</h2><label>الاسم الكامل<input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="الاسم الكامل" autoComplete="name" required/></label><label>رقم الهاتف<input type="tel" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="06XXXXXXXX" autoComplete="tel" required/></label><label>المدينة<input value={customerCity} onChange={e=>setCustomerCity(e.target.value)} placeholder="المدينة" autoComplete="address-level2" required/></label><label>العنوان بالتفصيل<textarea value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} placeholder="الحي، الشارع، رقم المنزل..." rows={3} autoComplete="street-address" required/></label><div className="detail-total"><span>المجموع الفرعي</span><b>{money(detailProduct.price*orderQuantity)}</b></div><button className="gold-button detail-order-button" onClick={()=>orderDirect(detailProduct)}>طلب الآن عبر واتساب <ArrowUpRight size={18}/></button>{orderSuccess&&<div className="order-success" role="status">{orderSuccess}<button onClick={()=>window.location.href='/'}>رجوع للمتجر</button></div>}<p className="detail-small-note">غادي يتحل واتساب برسالة فيها تفاصيل الطلب؛ خاصك تضغط على إرسال باش نتوصلو به.</p></div></section></div></main></div>;
}
return <div className="site-shell"><div className="announcement">LIVRAISON PARTOUT AU MAROC <span>✦</span> NOUVELLE COLLECTION DISPONIBLE</div>
<header className="header"><button className="icon-button mobile-menu" aria-label="Ouvrir le menu" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={21}/>:<Menu size={21}/>}</button><a className="brand" href="#"><img className="brand-logo" src={logo} alt="LioShop — Fashion for everyone" /></a>
<nav className={`nav ${menuOpen?'nav-open':''}`}><button onClick={()=>selectCategory('Tout')}>Accueil</button><button onClick={()=>selectCategory('نسائي')}>Femmes</button><button onClick={()=>selectCategory('رجالي')}>Hommes</button><button onClick={()=>selectCategory('أطفال')}>Enfants</button><a href="#collection" onClick={()=>setMenuOpen(false)}>Nos nouveautés <span className="nav-dot"/></a></nav>
<div className="header-actions"><label className="search-box"><Search size={17}/><input aria-label="Rechercher un produit" placeholder="Rechercher..." value={search} onChange={e=>{setSearch(e.target.value);document.getElementById('collection')?.scrollIntoView({behavior:'smooth'})}}/></label><button className="icon-button cart-trigger" aria-label="Ouvrir le panier" onClick={()=>setCartOpen(true)}><ShoppingBag size={20}/>{cartCount>0&&<span className="cart-count">{cartCount}</span>}</button></div></header>
<main><a className="lioshowcase-image-link" href="#collection" aria-label="Découvrir les produits LioShop"><img src={heroBanner} alt="LioShop — Real Product, Real Power — منتج حقيقي قوة حقيقية" fetchPriority="high"/></a><a className="promo-scroll-banner" href="#collection" aria-label="تخفيضات وعروض حصرية — اكتشف المنتجات">
  <span className="promo-spark promo-spark-one" aria-hidden="true">✦</span>
  <span className="promo-spark promo-spark-two" aria-hidden="true">✧</span>
  <span className="promo-spark promo-spark-three" aria-hidden="true">✦</span>
  <span className="promo-gift" aria-hidden="true">🎁</span>
  <span className="promo-sale" aria-hidden="true">% OFF</span>
  <span className="promo-banner-copy"><strong>تخفيضات وعروض حصرية</strong><small>اكتشف تشكيلتنا واستفد من عروضنا المميزة</small></span>
  <span className="promo-scroll-hint"><span>هبط للأسفل واكتشف منتجاتنا</span><span className="promo-arrows" aria-hidden="true">↓ ↓</span></span>
  <span className="promo-glow" aria-hidden="true"/>
</a><section className="collection section-wrap" id="collection"><div className="featured-best-seller"><div className="featured-best-copy"><span className="eyebrow"><span className="eyebrow-line"/> COUP DE CŒUR LIO</span><h2>LES PLUS VENDUS</h2><p>الأكثر مبيعاً</p><span className="featured-best-note">اختيار زبائن LioShop</span></div>{productsLoading?<div className="featured-best-loading">كنحمّلو المنتجات...</div>:(()=>{const best=products.find(p=>p.isBestSeller)||products[0];return best?<button type="button" className="featured-best-product" onClick={()=>openProduct(best.id)}><img src={best.image} alt={best.name}/><span className="featured-best-info"><span className="featured-best-tag">BEST SELLER · الأكثر مبيعاً</span><strong>{best.name}</strong><b>{money(best.price)}</b><span className="featured-best-cta">شاهد المنتج <ArrowUpRight size={15}/></span></span></button>:<div className="featured-best-loading">لا توجد منتجات حالياً</div>})()}</div><div className="filters">{(['Tout','رجالي','نسائي','أطفال'] as Category[]).map(c=><button key={c} onClick={()=>setCategory(c)} className={category===c?'filter active':'filter'}>{c}</button>)}<span className="result-count">{visible.length} ARTICLES</span></div>
<div className="product-grid">{productsLoading?<div className="empty-state">كنحمّلو المنتجات...</div>:productsError?<div className="empty-state">{productsError}</div>:visible.map(p=><article className="product-card" key={p.id}><div className="product-image-wrap"><img src={p.image} alt={p.name} loading="lazy" onClick={()=>openProduct(p.id)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")openProduct(p.id)}}/>{p.label&&<span className="product-label">{p.label}</span>}<button className={`favorite ${favorites.includes(p.id)?'favorite-active':''}`} aria-label="Ajouter aux favoris" onClick={()=>setFavorites(f=>f.includes(p.id)?f.filter(x=>x!==p.id):[...f,p.id])}><Heart size={18} fill={favorites.includes(p.id)?'currentColor':'none'}/></button><button className="quick-add" onClick={()=>{qty(p.id,1);setNotice("Produit ajouté au panier");window.setTimeout(()=>setNotice(""),2500)}}><ShoppingBag size={15}/> AJOUTER AU PANIER</button></div><div className="product-meta"><span>{p.category}</span><span className="product-stars">★★★★★</span></div><h3 onClick={()=>openProduct(p.id)} role="link" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")openProduct(p.id)}}>{p.name}</h3><div className="price-row"><b>{money(p.price)}</b>{p.oldPrice&&<del>{money(p.oldPrice)}</del>}</div></article>)}{!productsLoading&&!productsError&&visible.length===0&&<div className="empty-state">Aucun produit trouvé. Essayez une autre recherche.</div>}</div><button className="outline-button" onClick={()=>{setCategory('Tout');setSearch('')}}>VOIR TOUTE LA COLLECTION <ArrowUpRight size={16}/></button></section>
<section className="promise"><div className="promise-item"><span>01</span><div><b>Style pour tous</b><p>Des collections pour toute la famille.</p></div></div><div className="promise-item"><span>02</span><div><b>Prix accessibles</b><p>Le style qui respecte votre budget.</p></div></div><div className="promise-item"><span>03</span><div><b>Livraison au Maroc</b><p>Votre commande, où que vous soyez.</p></div></div></section>
<section className="newsletter"><div className="newsletter-mark"><Crown size={25}/></div><div><div className="eyebrow">REJOIGNEZ LE CLUB LIO</div><h2>Un peu plus de style<br/><em>dans votre boîte mail.</em></h2></div><form onSubmit={e=>{e.preventDefault();setNotice('Merci ! Vous êtes inscrit(e) à la newsletter.');window.setTimeout(()=>setNotice(''),2500)}}><label htmlFor="email">Recevez nos nouveautés et offres exclusives.</label><div className="email-field"><input id="email" type="email" placeholder="Votre adresse e-mail" required/><button type="submit" aria-label="S'inscrire"><ArrowUpRight size={20}/></button></div><small>En vous inscrivant, vous acceptez de recevoir nos actualités.</small></form></section></main>
<footer className="footer"><p>FASHION FOR EVERYONE.</p><div className="footer-links"><a href="#collection">Collection</a><a href="#collection">Livraison & retours</a><a href="#collection">Contact</a><a className="admin-entry" href="/admin" aria-label="Accéder à l’administration">Admin <ArrowUpRight size={13}/></a></div><span className="copyright">© 2026 LioShop. Tous droits réservés.</span></footer>
{notice&&<div className="toast"><Sparkles size={16}/>{notice}</div>}{cartOpen&&<div className="drawer-backdrop" onClick={()=>setCartOpen(false)}><aside className="cart-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">VOTRE SÉLECTION</span><h2>Mon panier <span>({cartCount})</span></h2></div><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="Fermer le panier"><X size={22}/></button></div>{cartItems.length===0?<div className="cart-empty"><ShoppingBag size={35}/><h3>Votre panier est vide</h3><p>Ajoutez vos pièces préférées pour les retrouver ici.</p><button className="gold-button" onClick={()=>{setCartOpen(false);selectCategory('Tout')}}>DÉCOUVRIR LA COLLECTION</button></div>:<><div className="cart-lines"><style>{`.cart-color-dot{position:relative;display:inline-flex;align-items:center;justify-content:center}.cart-color-dot.selected{outline:3px solid #7c1428;outline-offset:3px;transform:scale(1.12)}.cart-color-dot.selected:after{content:"✓";display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:16px;font-weight:900;color:#fff;text-shadow:0 1px 3px #000,1px 0 2px #000,-1px 0 2px #000;pointer-events:none}.cart-color-dot{width:24px;height:24px;min-width:24px;border-radius:50%;padding:0;cursor:pointer;border:1px solid #cfcfcf}.cart-color-dot.selected{border:2px solid #7c1428;box-shadow:0 0 0 2px #fff,0 0 0 3px #7c1428}`}</style>{cartItems.map(p=><div className="cart-line" key={p.id}><img src={p.image} alt={p.name}/><div className="cart-line-info"><b>{p.name}</b><span>{money(p.price)}</span>{p.colors.length>0&&<div style={{display:"grid",gap:6,margin:"8px 0"}}><small style={{fontSize:12,color:"#777"}}>اللون</small><div style={{display:"flex",flexWrap:"wrap",gap:9}}>{p.colors.map((color,i)=><button type="button" key={color+i} title={color} aria-label={"اختيار اللون "+color} aria-pressed={(cartColors[p.id]||p.colors[0])===color} onClick={()=>setCartColors(current=>({...current,[p.id]:color}))} className={(cartColors[p.id]||p.colors[0])===color?"cart-color-dot selected":"cart-color-dot"} style={{backgroundColor:colorCss(color)}}/>)}</div></div>}<div className="quantity"><button onClick={()=>qty(p.id,-1)} aria-label="Diminuer"><Minus size={13}/></button><span>{cart[p.id]}</span><button onClick={()=>qty(p.id,1)} aria-label="Augmenter"><Plus size={13}/></button></div></div><button className="remove-item" onClick={()=>setCart(c=>{const n={...c};delete n[p.id];return n})} aria-label="Supprimer"><Trash2 size={16}/></button></div>)}</div><div className="cart-bottom"><div className="subtotal"><span>Sous-total</span><b>{money(cartTotal)}</b></div><p>Les frais de livraison seront confirmés lors de la commande.</p><div className="whatsapp-checkout" style={{display:'grid',gap:10,marginTop:14}}>
{!checkoutOpen?<button type="button" className="gold-button checkout" onClick={()=>setCheckoutOpen(true)}>تأكيد الطلب <ArrowUpRight size={17}/></button>:<>
<h3 style={{margin:'8px 0 2px'}}>معلومات التوصيل</h3>
<label style={{display:'grid',gap:5}}>الاسم الكامل<input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="الاسم الكامل" autoComplete="name" required style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box'}} /></label>
<label style={{display:'grid',gap:5}}>رقم الهاتف<input type="tel" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="06XXXXXXXX" autoComplete="tel" required style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box'}} /></label>
<label style={{display:'grid',gap:5}}>البريد الإلكتروني (اختياري)<input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="name@example.com" style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box'}} /></label>
<label style={{display:'grid',gap:5}}>المدينة<input value={customerCity} onChange={e=>setCustomerCity(e.target.value)} placeholder="المدينة" autoComplete="address-level2" required style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box'}} /></label>
<label style={{display:'grid',gap:5}}>العنوان بالتفصيل<textarea value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} placeholder="العنوان بالتفصيل" autoComplete="street-address" required rows={3} style={{padding:11,border:'1px solid #ddd',borderRadius:6,width:'100%',boxSizing:'border-box',resize:'vertical'}} /></label>
<button type="button" className="gold-button checkout" onClick={orderWhatsApp} style={{background:'#25D366',color:'#fff'}}>🟢 إرسال الطلب عبر واتساب <ArrowUpRight size={17}/></button>
<button type="button" onClick={()=>setCheckoutOpen(false)} style={{background:'transparent',border:0,padding:8,cursor:'pointer'}}>رجوع للسلة</button>
</>}
</div></div></>}</aside></div>}</div>}
