import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, Search, Package, Phone, MapPin, ChevronDown } from 'lucide-react';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
const db = url && key ? createClient(url, key) : null;

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
type OrderItem = { id: string; product_name: string; unit_price: number|string; quantity: number; selected_size: string|null; selected_color: string|null };
type Order = { id: string; order_number: number; customer_name: string; customer_phone: string; customer_email: string|null; customer_address: string; customer_city: string|null; notes: string|null; status: OrderStatus; subtotal: number|string; shipping_fee: number|string; total: number|string; created_at: string; order_items: OrderItem[] };

const statusLabels: Record<OrderStatus,string> = {pending:'جديد',confirmed:'مؤكد',preparing:'قيد التجهيز',shipped:'تم الشحن',delivered:'مكتمل',cancelled:'ملغى'};
const statusOptions: OrderStatus[] = ['pending','confirmed','preparing','shipped','delivered','cancelled'];
const money=(value:number|string)=>Number(value||0).toLocaleString('fr-MA')+' DH';

export default function OrdersPanel(){
 const [orders,setOrders]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [busyId,setBusyId]=useState<string|null>(null);
 const [error,setError]=useState('');
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState<'all'|OrderStatus>('all');
 const [expanded,setExpanded]=useState<string|null>(null);

 const load=useCallback(async()=>{
  if(!db){setError('إعدادات Supabase ناقصة');setLoading(false);return;}
  setLoading(true);setError('');
  const {data,error:loadError}=await db.from('orders').select('id,order_number,customer_name,customer_phone,customer_email,customer_address,customer_city,notes,status,subtotal,shipping_fee,total,created_at,order_items(id,product_name,unit_price,quantity,selected_size,selected_color)').order('created_at',{ascending:false}).limit(200);
  if(loadError){setError('تعذر تحميل الطلبات: '+loadError.message);setOrders([]);}
  else setOrders((data??[]) as unknown as Order[]);
  setLoading(false);
 },[]);

 useEffect(()=>{void load()},[load]);

 async function changeStatus(order:Order,status:OrderStatus){
  if(!db)return;
  setBusyId(order.id);setError('');
  const {error:updateError}=await db.from('orders').update({status}).eq('id',order.id).select('id').single();
  if(updateError)setError('تعذر تحديث حالة الطلب #'+order.order_number+': '+updateError.message);
  else setOrders(current=>current.map(item=>item.id===order.id?{...item,status}:item));
  setBusyId(null);
 }

 const filtered=useMemo(()=>orders.filter(order=>(filter==='all'||order.status===filter)&&[String(order.order_number),order.customer_name,order.customer_phone,order.customer_city||''].join(' ').toLowerCase().includes(search.toLowerCase())),[orders,filter,search]);
 const stats=useMemo(()=>({all:orders.length,pending:orders.filter(o=>o.status==='pending').length,confirmed:orders.filter(o=>o.status==='confirmed').length,delivered:orders.filter(o=>o.status==='delivered').length}),[orders]);

 return <section className="orders-panel">
  <div className="orders-heading"><div><h2>إدارة الطلبات</h2><p>تتبع الطلبات، معلومات الزبناء، والمنتجات المطلوبة.</p></div><button className="admin-secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> تحديث</button></div>
  {error&&<p className="admin-message">{error}</p>}
  <div className="orders-stats"><div><small>كل الطلبات</small><b>{stats.all}</b></div><div><small>طلبات جديدة</small><b>{stats.pending}</b></div><div><small>مؤكدة</small><b>{stats.confirmed}</b></div><div><small>مكتملة</small><b>{stats.delivered}</b></div></div>
  <div className="orders-filters"><label className="orders-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="قلب برقم الطلب أو الاسم أو الهاتف"/></label><select value={filter} onChange={e=>setFilter(e.target.value as 'all'|OrderStatus)}><option value="all">جميع الحالات</option>{statusOptions.map(status=><option key={status} value={status}>{statusLabels[status]}</option>)}</select></div>
  {loading?<div className="admin-empty">كنحمّلو الطلبات...</div>:filtered.length===0?<div className="admin-empty"><Package size={26}/><p>ما كايناش طلبات مطابقة.</p></div>:<div className="orders-list">{filtered.map(order=><article className="order-card" key={order.id}>
   <button type="button" className="order-card-toggle" onClick={()=>setExpanded(expanded===order.id?null:order.id)}>
    <span className="order-number">#{order.order_number}</span><span className="order-customer"><b>{order.customer_name}</b><small>{new Date(order.created_at).toLocaleString('fr-MA')}</small></span><span className={'order-status status-'+order.status}>{statusLabels[order.status]}</span><b className="order-total">{money(order.total)}</b><ChevronDown size={17} className={expanded===order.id?'order-chevron open':'order-chevron'}/>
   </button>
   {expanded===order.id&&<div className="order-details">
    <div className="order-customer-details"><span><Phone size={14}/> {order.customer_phone}</span>{order.customer_email&&<span>{order.customer_email}</span>}<span><MapPin size={14}/> {order.customer_city||'—'}، {order.customer_address}</span></div>
    <div className="orders-items">{(order.order_items||[]).map(item=><div className="orders-item" key={item.id}><span>{item.product_name}</span><small>{item.quantity} × {money(item.unit_price)}{item.selected_size?' · المقاس '+item.selected_size:''}{item.selected_color?' · اللون '+item.selected_color:''}</small><b>{money(Number(item.unit_price)*item.quantity)}</b></div>)}</div>
    <div className="order-totals"><span>المجموع الفرعي: {money(order.subtotal)}</span><span>التوصيل: {money(order.shipping_fee)}</span><b>الإجمالي: {money(order.total)}</b></div>
    {order.notes&&<p className="order-notes">{order.notes}</p>}
    <div className="order-status-control"><label htmlFor={'status-'+order.id}>تغيير حالة الطلب</label><select id={'status-'+order.id} value={order.status} disabled={busyId===order.id} onChange={e=>void changeStatus(order,e.target.value as OrderStatus)}>{statusOptions.map(status=><option key={status} value={status}>{statusLabels[status]}</option>)}</select>{busyId===order.id&&<small>كنحدّثو الحالة...</small>}</div>
   </div>}
  </article>)}</div>}
 </section>;
}
