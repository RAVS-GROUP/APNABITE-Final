/** APNABITE CUSTOMER CART — context, instant controls and billing */
const CustomerCartPage = {
  SYNC_DELAY_MS: 350,
  CACHE_KEY: "apnabite_customer_cart_context",
  elements: {}, cart: null, items: [], menuProducts: [], billing: {}, offers: {}, payment: {},
  summary: { distinctItems: 0, totalQuantity: 0, subtotal: 0 },
  loading: false, syncEntries: {}, syncTimers: {}, statusTimer: null,

  init() {
    const ids = ["cartLoader","cartPage","cartBackButton","clearCartButton","cartKitchenCard","cartKitchenName","cartKitchenMeta","cartItemsSection","cartItemCount","cartItemsList","cartMenuSection","cartMenuSlider","cartOfferCard","cartAppliedOffer","cartBankOffer","cartBillCard","cartSubtotal","cartDeliveryFee","cartPlatformFee","cartTaxRow","cartTax","cartDiscountRow","cartDiscount","cartRewardRow","cartReward","cartTotal","quoteStatus","cartEmptyState","cartErrorState","cartErrorMessage","retryCartButton","cartStatus","cartCheckoutBar","checkoutItemCount","checkoutSubtotal","proceedCheckoutButton","clearCartDialog","cancelClearCartButton","confirmClearCartButton"];
    ids.forEach((id) => { this.elements[id] = document.getElementById(id); });
    if (ids.some((id) => !this.elements[id])) { console.error("Customer cart page elements are missing."); return false; }
    this.bindEvents();
    const restored = this.restoreContext();
    if (restored) { this.applyContext(restored, false); this.showPage(); }
    this.loadContext({ background: restored });
    return true;
  },

  bindEvents() {
    this.elements.cartBackButton.addEventListener("click", () => window.history.length > 1 ? window.history.back() : window.location.assign("home.html"));
    this.elements.retryCartButton.addEventListener("click", () => this.loadContext());
    this.elements.clearCartButton.addEventListener("click", () => this.openClearDialog());
    this.elements.cancelClearCartButton.addEventListener("click", () => this.closeClearDialog());
    this.elements.confirmClearCartButton.addEventListener("click", () => this.clearCart());
    this.elements.clearCartDialog.addEventListener("cancel", () => this.closeClearDialog());
    this.elements.cartItemsList.addEventListener("click", (event) => this.handleActionEvent(event));
    this.elements.cartMenuSlider.addEventListener("click", (event) => this.handleActionEvent(event));
    this.elements.proceedCheckoutButton.addEventListener("click", () => this.proceedToPayment());
  },

  getSessionId() { const session = SessionManager.get(); return session && session.sessionId ? session.sessionId : ""; },

  async loadContext(options = {}) {
    if (this.loading) return { success:false, reason:"CART_LOADING" };
    this.loading = true;
    if (!options.background) this.showInitialLoader();
    try {
      const response = await API.request("get_customer_cart_context", { sessionId:this.getSessionId() }, { timeoutMs:90000 });
      const result = response.data || {};
      this.applyContext(result, true);
      this.showPage();
      return { success:true, data:result };
    } catch (error) {
      console.error("Customer cart context load failed:", error);
      this.showPage();
      if (!this.items.length) this.showError(error.message || "Your cart could not be loaded.");
      else this.showStatus("Saved cart shown. Fresh bill could not be loaded yet.");
      return { success:false, code:error.code || "CART_CONTEXT_FAILED" };
    } finally { this.loading = false; }
  },

  applyContext(result, save) {
    const status = String(result.status || "").toUpperCase();
    this.cart = result.cart || null;
    this.items = Array.isArray(result.items) ? result.items : [];
    this.menuProducts = Array.isArray(result.menuProducts) ? result.menuProducts.slice().sort((a,b) => Number(a.price||0)-Number(b.price||0)) : [];
    this.billing = result.billing || {};
    this.offers = result.offers || {};
    this.payment = result.payment || {};
    if (result.kitchen) this.kitchen = result.kitchen;
    if (status === "EMPTY" || !this.items.length) { this.cart=null; this.items=[]; this.billing={}; }
    this.resetSync(); this.recalculate(false); if (save) this.saveContext(result);
  },

  recalculate(estimateBill = true) {
    this.items = this.items.filter((item) => Number(item.quantity || 0) > 0);
    let totalQuantity=0, subtotal=0;
    this.items.forEach((item) => { const q=Number(item.quantity||0), p=Number(item.currentPrice||item.priceSnapshot||0); item.itemTotal=this.round(p*q); totalQuantity+=q; subtotal+=item.itemTotal; });
    this.summary = { distinctItems:this.items.length, totalQuantity, subtotal:this.round(subtotal) };
    if (!this.items.length) this.cart=null;
    if (estimateBill) this.estimateBilling();
    this.render();
  },

  estimateBilling() {
    const oldSubtotal=Number(this.billing.subtotal||0), newSubtotal=this.summary.subtotal;
    this.billing.subtotal=newSubtotal;
    const fixed = Number(this.billing.deliveryFee||0)+Number(this.billing.platformFee||0)+Number(this.billing.taxAmount||0)-Number(this.billing.discountAmount||0)-Number(this.billing.rewardAmount||0);
    this.billing.finalPayableAmount=this.round(newSubtotal+fixed);
    if (!oldSubtotal && !Object.keys(this.billing).length) this.billing.finalPayableAmount=newSubtotal;
    this.billing.quoteNeedsRefresh=true;
  },

  render() {
    const hasItems=this.items.length>0;
    ["cartKitchenCard","cartItemsSection","cartBillCard","cartOfferCard","cartCheckoutBar"].forEach((key)=>this.elements[key].classList.toggle("hidden",!hasItems));
    this.elements.cartMenuSection.classList.toggle("hidden",!hasItems||!this.menuProducts.length);
    this.elements.cartEmptyState.classList.toggle("hidden",hasItems);
    this.elements.clearCartButton.classList.toggle("hidden",!hasItems);
    this.elements.cartErrorState.classList.add("hidden");
    if (!hasItems) { this.elements.cartItemsList.innerHTML=""; this.elements.cartMenuSlider.innerHTML=""; return; }
    this.elements.cartKitchenName.textContent=(this.cart&&this.cart.businessName)||(this.kitchen&&this.kitchen.businessName)||"Kitchen";
    this.elements.cartKitchenMeta.textContent=this.kitchen ? [this.kitchen.businessType,this.kitchen.operatingStatus].filter(Boolean).join(" • ") : "";
    const itemText=this.summary.totalQuantity+(this.summary.totalQuantity===1?" item":" items");
    this.elements.cartItemCount.textContent=itemText; this.elements.checkoutItemCount.textContent=itemText;
    this.elements.cartItemsList.innerHTML=""; this.items.forEach((item)=>this.elements.cartItemsList.appendChild(this.createItemCard(item)));
    this.renderMenu(); this.renderBilling();
  },

  renderBilling() {
    const b=this.billing, subtotal=Number(b.subtotal ?? this.summary.subtotal), finalAmount=Number(b.finalPayableAmount ?? subtotal);
    this.elements.cartSubtotal.textContent=this.money(subtotal);
    this.setFee("cartDeliveryFee", Number(b.deliveryFee||0), b.deliveryFeeWaived===true);
    this.setFee("cartPlatformFee", Number(b.platformFee||0), b.platformFeeWaived===true);
    this.toggleAmount("cartTaxRow","cartTax",Number(b.taxAmount||0),false);
    this.toggleAmount("cartDiscountRow","cartDiscount",Number(b.discountAmount||0),true);
    this.toggleAmount("cartRewardRow","cartReward",Number(b.rewardAmount||0),true);
    this.elements.cartTotal.textContent=this.money(finalAmount); this.elements.checkoutSubtotal.textContent=this.money(finalAmount);
    this.elements.quoteStatus.textContent=b.quoteAvailable ? (b.quoteNeedsRefresh ? "Final bill will be revalidated before payment." : "Price verified by ApnaBite • Quote valid for 10 minutes") : "Final charges will be verified before payment.";
    const offer=this.offers.appliedOffer;
    this.elements.cartAppliedOffer.classList.toggle("hidden",!offer);
    if (offer) this.elements.cartAppliedOffer.textContent="✓ "+(offer.title||offer.offerName||"Offer applied");
  },

  setFee(id,value,waived) { this.elements[id].textContent=waived ? "FREE" : this.money(value); this.elements[id].classList.toggle("saving",waived); },
  toggleAmount(rowId,valueId,value,negative) { this.elements[rowId].classList.toggle("hidden",value<=0); this.elements[valueId].textContent=(negative?"−":"")+this.money(value); },

  createItemCard(item) {
    const article=document.createElement("article"); article.className="cart-item";
    const media=this.createImage(item.imageUrl,"cart-item-image");
    const content=document.createElement("div"); content.className="cart-item-content";
    const heading=document.createElement("div"); heading.className="cart-item-heading";
    const copy=document.createElement("div"), title=document.createElement("h3"), detail=document.createElement("p"), price=document.createElement("strong");
    title.textContent=item.productName||"Dish"; detail.textContent=item.variantName||item.quantityLabel||"Freshly prepared"; price.className="cart-item-price"; price.textContent=this.money(item.currentPrice||item.priceSnapshot||0);
    copy.append(title,detail); heading.append(copy,price);
    const bottom=document.createElement("div"), total=document.createElement("span"); bottom.className="cart-item-bottom"; total.className="cart-item-total"; total.textContent=this.money(item.itemTotal||0); bottom.append(total,this.createQuantityControl(item)); content.append(heading,bottom);
    if(item.productAvailable===false){const warning=document.createElement("p");warning.className="cart-unavailable";warning.textContent="Currently unavailable";content.appendChild(warning);}
    article.append(media,content); return article;
  },

  createImage(url,className) { const media=document.createElement("div"); media.className=className; if(url){const image=document.createElement("img");image.src=url;image.alt="";image.loading="lazy";image.addEventListener("error",()=>{image.remove();media.textContent="🍲";});media.appendChild(image);}else media.textContent="🍲"; return media; },

  createQuantityControl(item, small=false) {
    const control=document.createElement("div"); control.className=small?"menu-quantity":"cart-quantity-control";
    const minus=document.createElement("button"), quantity=document.createElement("strong"), plus=document.createElement("button");
    minus.type=plus.type="button"; minus.dataset.cartAction=Number(item.quantity||0)<=1?"REMOVE":"DECREASE"; plus.dataset.cartAction="INCREASE";
    minus.dataset.cartItemId=plus.dataset.cartItemId=String(item.cartItemId||""); minus.textContent=Number(item.quantity||0)<=1?"×":"−"; plus.textContent="+"; quantity.textContent=String(item.quantity||1); control.append(minus,quantity,plus); return control;
  },

  renderMenu() {
    this.elements.cartMenuSlider.innerHTML="";
    this.menuProducts.forEach((product)=>{
      const card=document.createElement("article");card.className="menu-product";
      const copy=document.createElement("div");copy.className="menu-product-copy";
      const title=document.createElement("h3"),detail=document.createElement("p"),bottom=document.createElement("div"),price=document.createElement("strong");
      title.textContent=product.productName||"Dish";detail.textContent=product.variantName||product.quantityLabel||product.description||"";bottom.className="menu-product-bottom";price.textContent=this.money(product.price||0);
      const item=this.items.find((x)=>String(x.productId||"")===String(product.productId||"")&&String(x.variantId||"")===String(product.variantId||""));
      if(item) bottom.append(price,this.createQuantityControl(item,true));
      else {const add=document.createElement("button");add.type="button";add.className="menu-add";add.textContent="ADD";add.dataset.cartAction="ADD";["productId","variantId","chefId","productName","price"].forEach((key)=>add.dataset[key]=String(product[key]??""));bottom.append(price,add);}
      copy.append(title,detail,bottom);card.append(this.createImage(product.imageUrl,"menu-product-image"),copy);this.elements.cartMenuSlider.appendChild(card);
    });
  },

  handleActionEvent(event) {
    const button=event.target.closest("[data-cart-action]"); if(!button||button.disabled)return;
    const action=String(button.dataset.cartAction||"").toUpperCase();
    if(action==="ADD"){this.addMenuProduct(button);return;}
    const item=this.items.find((x)=>String(x.cartItemId||"")===String(button.dataset.cartItemId||"")); if(!item){this.showStatus("Cart changed. Please tap again.");return;}
    const q=Number(item.quantity||0); if(action==="INCREASE")this.setItemQuantity(item,q+1); if(action==="DECREASE")this.setItemQuantity(item,q-1); if(action==="REMOVE")this.setItemQuantity(item,0);
  },

  async addMenuProduct(button) {
    const product={chefId:button.dataset.chefId,productId:button.dataset.productId,variantId:button.dataset.variantId,productName:button.dataset.productName,price:Number(button.dataset.price||0)};
    if(!product.productId||!product.chefId){this.showStatus("This product is unavailable.");return;}
    const optimistic={cartItemId:"PENDING_"+product.productId+"_"+Date.now(),productId:product.productId,variantId:product.variantId,chefId:product.chefId,productName:product.productName,quantity:1,currentPrice:product.price,priceSnapshot:product.price,productAvailable:true};
    this.items.push(optimistic);this.recalculate();
    try {const response=await API.request("add_customer_cart_item",{sessionId:this.getSessionId(),chefId:product.chefId,productId:product.productId,variantId:product.variantId,quantity:1},{timeoutMs:90000});this.mergeCartResponse(response.data||{});this.showStatus(product.productName+" added.");}
    catch(error){this.items=this.items.filter((x)=>x!==optimistic);this.recalculate();this.showStatus(error.message||"Item could not be added.");}
  },

  getEntry(item) { const key=String(item.cartItemId||""); if(!this.syncEntries[key])this.syncEntries[key]={key,item:JSON.parse(JSON.stringify(item)),confirmedQuantity:Number(item.quantity||0),targetQuantity:Number(item.quantity||0),running:false}; return this.syncEntries[key]; },
  setItemQuantity(item,quantity) { const target=Math.max(0,Math.min(20,Number(quantity||0))),entry=this.getEntry(item);entry.targetQuantity=target;if(target<=0)this.items=this.items.filter((x)=>String(x.cartItemId||"")!==entry.key);else{const current=this.items.find((x)=>String(x.cartItemId||"")===entry.key);if(current)current.quantity=target;}this.recalculate();clearTimeout(this.syncTimers[entry.key]);this.syncTimers[entry.key]=setTimeout(()=>this.flushEntry(entry.key),this.SYNC_DELAY_MS); },

  async flushEntry(key) {
    const entry=this.syncEntries[key];if(!entry||entry.running||entry.targetQuantity===entry.confirmedQuantity)return;entry.running=true;const sent=entry.targetQuantity;
    try {const response=sent<=0?await API.request("remove_customer_cart_item",{sessionId:this.getSessionId(),cartItemId:key},{timeoutMs:90000}):await API.request("update_customer_cart_item",{sessionId:this.getSessionId(),cartItemId:key,quantity:sent},{timeoutMs:90000});const result=response.data||{},serverItem=Array.isArray(result.items)?result.items.find((x)=>String(x.cartItemId||"")===key):null;entry.confirmedQuantity=serverItem?Number(serverItem.quantity||0):0;if(result.cart)this.cart=Object.assign({},result.cart,{businessName:this.cart&&this.cart.businessName});const local=this.items.find((x)=>String(x.cartItemId||"")===key);if(local&&serverItem)Object.assign(local,serverItem,{quantity:entry.targetQuantity});this.recalculate();}
    catch(error){entry.targetQuantity=entry.confirmedQuantity;let local=this.items.find((x)=>String(x.cartItemId||"")===key);if(entry.confirmedQuantity>0&&!local){local=JSON.parse(JSON.stringify(entry.item));this.items.push(local);}if(local)local.quantity=entry.confirmedQuantity;this.recalculate();this.showStatus("Change could not be saved. Previous quantity restored.");}
    finally{entry.running=false;if(entry.targetQuantity!==entry.confirmedQuantity)this.syncTimers[key]=setTimeout(()=>this.flushEntry(key),0);else if(entry.confirmedQuantity<=0){delete this.syncEntries[key];delete this.syncTimers[key];}}
  },

  mergeCartResponse(result) { this.cart=Object.assign({},result.cart||this.cart,{businessName:(this.cart&&this.cart.businessName)||(this.kitchen&&this.kitchen.businessName)});this.items=Array.isArray(result.items)?result.items:this.items;this.resetSync();this.recalculate(); },
  resetSync(){Object.keys(this.syncTimers).forEach((key)=>clearTimeout(this.syncTimers[key]));this.syncEntries={};this.syncTimers={};},

  async clearCart(){const previous={cart:this.cart,items:JSON.parse(JSON.stringify(this.items)),billing:Object.assign({},this.billing)};this.closeClearDialog();this.resetSync();this.cart=null;this.items=[];this.recalculate();try{await API.request("clear_customer_cart",{sessionId:this.getSessionId()},{timeoutMs:90000});localStorage.removeItem(this.CACHE_KEY);this.showStatus("Cart cleared.");}catch(error){this.cart=previous.cart;this.items=previous.items;this.billing=previous.billing;this.recalculate();this.showStatus("Cart could not be cleared. Items restored.");}},
  proceedToPayment(){if(!this.items.length)return;sessionStorage.setItem("apnabite_payment_context",JSON.stringify({cart:this.cart,items:this.items,billing:this.billing,offers:this.offers,payment:this.payment,savedAt:new Date().toISOString()}));window.location.href="payment.html";},
  saveContext(result){try{localStorage.setItem(this.CACHE_KEY,JSON.stringify(Object.assign({},result,{savedAt:new Date().toISOString()})));}catch(error){console.warn("Cart cache unavailable",error);}},
  restoreContext(){try{const data=JSON.parse(localStorage.getItem(this.CACHE_KEY)||"null");return data&&Array.isArray(data.items)?data:null;}catch(error){return null;}},
  openClearDialog(){typeof this.elements.clearCartDialog.showModal==="function"?this.elements.clearCartDialog.showModal():this.elements.clearCartDialog.setAttribute("open","");},
  closeClearDialog(){if(typeof this.elements.clearCartDialog.close==="function"&&this.elements.clearCartDialog.open)this.elements.clearCartDialog.close();else this.elements.clearCartDialog.removeAttribute("open");},
  showInitialLoader(){this.elements.cartLoader.classList.remove("hidden");this.elements.cartPage.classList.add("hidden");},
  showPage(){this.elements.cartLoader.classList.add("hidden");this.elements.cartPage.classList.remove("hidden");},
  showError(message){this.elements.cartErrorMessage.textContent=message;this.elements.cartErrorState.classList.remove("hidden");["cartEmptyState","cartKitchenCard","cartItemsSection","cartMenuSection","cartOfferCard","cartBillCard","cartCheckoutBar"].forEach((key)=>this.elements[key].classList.add("hidden"));},
  showStatus(message){clearTimeout(this.statusTimer);this.elements.cartStatus.textContent=message;this.elements.cartStatus.classList.remove("hidden");this.statusTimer=setTimeout(()=>this.elements.cartStatus.classList.add("hidden"),3500);},
  round(value){return Math.round((Number(value||0)+Number.EPSILON)*100)/100;},
  money(value){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value||0));},

  testCartContextUI(){const prices=this.menuProducts.map((x)=>Number(x.price||0));const results=[
    {test:"Complete kitchen name",passed:Boolean(this.cart&&this.cart.businessName),actual:this.cart&&this.cart.businessName},
    {test:"Menu products",passed:Array.isArray(this.menuProducts)&&this.menuProducts.length>0,actual:this.menuProducts.length},
    {test:"Menu low to high",passed:prices.every((x,i)=>i===0||prices[i-1]<=x),actual:prices},
    {test:"Final payable",passed:Number.isFinite(Number(this.billing.finalPayableAmount)),actual:this.billing.finalPayableAmount},
    {test:"No cart spinner",passed:document.querySelectorAll(".cart-control-loading").length===0,actual:document.querySelectorAll(".cart-control-loading").length},
    {test:"Payment handoff",passed:typeof this.proceedToPayment==="function",actual:typeof this.proceedToPayment}
  ];const passed=results.every((x)=>x.passed);console.table(results);console.log(passed?"Customer Cart Context UI Test: PASS":"Customer Cart Context UI Test: FAIL");return{success:passed,status:passed?"PASS":"FAIL",results};}
};
document.addEventListener("DOMContentLoaded",()=>CustomerCartPage.init());
