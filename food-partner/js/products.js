/**
 * APNABITE FOOD PARTNER PRODUCTS
 * FILE: food-partner/js/products.js
 * VERSION: 1.0.0
 */

const FoodPartnerProducts={
  MAX_IMAGE_BYTES:2*1024*1024,
  IMAGE_TYPES:["image/jpeg","image/png","image/webp"],
  state:{loading:false,saving:false,products:[],partner:null,editingId:"",previewUrl:""},
  elements:{},

  init(){
    const ids={kitchen:"kitchenName",count:"productCount",add:"addProductButton",emptyAdd:"emptyAddProductButton",loading:"productsLoading",error:"productsError",list:"productList",empty:"productsEmpty",dialog:"productDialog",close:"closeProductButton",formTitle:"productFormTitle",form:"productForm",id:"productIdInput",name:"productNameInput",description:"productDescriptionInput",category:"productCategoryInput",foodType:"productFoodTypeInput",price:"productPriceInput",prep:"productPrepTimeInput",portion:"productPortionInput",keywords:"productKeywordsInput",offer:"productOfferInput",image:"productImageInput",preview:"productImagePreview",imageIcon:"imagePickerIcon",imageTitle:"imagePickerTitle",imageRequirement:"imageRequirementText",formError:"productFormError",save:"saveProductButton"};
    Object.keys(ids).forEach(k=>this.elements[k]=document.getElementById(ids[k]));
    if(!Object.values(this.elements).every(Boolean)){console.error("Food Partner product page elements are missing.");return false}
    this.bind();this.load();console.log("ApnaBite Food Partner Products initialized.");return true;
  },

  bind(){
    this.elements.add.addEventListener("click",()=>this.openCreate());
    this.elements.emptyAdd.addEventListener("click",()=>this.openCreate());
    this.elements.close.addEventListener("click",()=>this.closeForm());
    this.elements.dialog.addEventListener("click",e=>{if(e.target.dataset.closeProduct==="true")this.closeForm()});
    this.elements.form.addEventListener("submit",e=>{e.preventDefault();this.save()});
    this.elements.image.addEventListener("change",()=>this.updatePreview());
    this.elements.list.addEventListener("click",e=>{const b=e.target.closest("[data-product-action]");if(!b)return;const p=this.state.products.find(x=>x.productId===b.dataset.productId);if(!p)return;if(b.dataset.productAction==="edit")this.openEdit(p);if(b.dataset.productAction==="availability")this.toggleAvailability(p)});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")this.closeForm()});
  },

  sessionId(){const s=SessionManager.get();return s&&s.sessionId?s.sessionId:""},

  async load(){
    if(this.state.loading)return;this.state.loading=true;this.elements.loading.classList.remove("hidden");this.elements.error.classList.add("hidden");
    try{const r=await API.request("get_food_partner_products",{sessionId:this.sessionId()});const d=r.data||{};this.state.products=Array.isArray(d.products)?d.products:[];this.state.partner=d.partner||null;this.render();return d}
    catch(e){this.elements.error.textContent=e.message||"Products could not be loaded.";this.elements.error.classList.remove("hidden");return null}
    finally{this.state.loading=false;this.elements.loading.classList.add("hidden")}
  },

  render(){
    this.elements.kitchen.textContent=this.state.partner&&this.state.partner.businessName?this.state.partner.businessName:"Food products";
    this.elements.count.textContent=String(this.state.products.length);this.elements.list.innerHTML="";
    this.state.products.forEach(p=>this.elements.list.appendChild(this.card(p)));
    this.elements.empty.classList.toggle("hidden",this.state.products.length>0);
  },

  card(p){
    const card=document.createElement("article");card.className="product-card";
    const img=document.createElement("img");img.src=p.imageUrl||"";img.alt=p.productName||"Product";img.loading="lazy";img.addEventListener("error",()=>{img.removeAttribute("src");img.alt="Image unavailable"});
    const content=document.createElement("div");content.className="product-card-content";
    const title=document.createElement("h3");title.textContent=p.productName||"Unnamed product";
    const desc=document.createElement("p");desc.textContent=p.description||"";
    const meta=document.createElement("div");meta.className="product-meta";const dot=document.createElement("span");dot.className="food-dot "+(String(p.foodType).toUpperCase()==="VEG"?"veg":"non-veg");const price=document.createElement("strong");price.textContent="₹"+this.money(p.price);const portion=document.createElement("small");portion.textContent=" • "+(p.portion||"");meta.append(dot,price,portion);
    const actions=document.createElement("div");actions.className="product-actions";const edit=document.createElement("button");edit.type="button";edit.dataset.productAction="edit";edit.dataset.productId=p.productId;edit.textContent="Edit";const availability=document.createElement("button");availability.type="button";availability.dataset.productAction="availability";availability.dataset.productId=p.productId;const available=String(p.availabilityStatus).toUpperCase()==="AVAILABLE";availability.className="availability "+(available?"available":"out");availability.textContent=available?"Available":"Out of stock";actions.append(edit,availability);content.append(title,desc,meta,actions);card.append(img,content);return card;
  },

  openCreate(){this.resetForm();this.state.editingId="";this.elements.formTitle.textContent="Add Product";this.elements.imageRequirement.textContent="(required)";this.elements.save.textContent="Save Product";this.showDialog()},

  openEdit(p){this.resetForm();this.state.editingId=p.productId;this.elements.id.value=p.productId;this.elements.name.value=p.productName||"";this.elements.description.value=p.description||"";this.elements.category.value=p.category||"";this.elements.foodType.value=p.foodType||"";this.elements.price.value=p.price||"";this.elements.prep.value=p.preparationTimeMinutes||"";this.elements.portion.value=p.portion||"";this.elements.keywords.value=Array.isArray(p.keywords)?p.keywords.join(", "):"";this.elements.offer.checked=p.offerEligible===true;this.elements.formTitle.textContent="Edit Product";this.elements.imageRequirement.textContent="(optional when editing)";this.elements.imageTitle.textContent="Choose a new photo or keep current";if(p.imageUrl)this.setPreview(p.imageUrl,false);this.elements.save.textContent="Update Product";this.showDialog()},

  showDialog(){this.clearFormError();this.elements.dialog.classList.remove("hidden");this.elements.dialog.setAttribute("aria-hidden","false");window.setTimeout(()=>this.elements.name.focus(),50)},
  closeForm(force=false){if(this.state.saving&&!force)return;this.elements.dialog.classList.add("hidden");this.elements.dialog.setAttribute("aria-hidden","true");this.revokePreview()},
  resetForm(){this.elements.form.reset();this.elements.id.value="";this.elements.preview.classList.add("hidden");this.elements.preview.removeAttribute("src");this.elements.imageIcon.classList.remove("hidden");this.elements.imageTitle.textContent="Choose product photo";this.revokePreview();this.clearFormError()},

  updatePreview(){const f=this.elements.image.files[0];if(!f){this.elements.imageTitle.textContent="Choose product photo";return}this.elements.imageTitle.textContent=f.name+" • "+this.bytes(f.size);this.revokePreview();this.state.previewUrl=URL.createObjectURL(f);this.setPreview(this.state.previewUrl,true)},
  setPreview(url){this.elements.preview.src=url;this.elements.preview.classList.remove("hidden");this.elements.imageIcon.classList.add("hidden")},
  revokePreview(){if(this.state.previewUrl){URL.revokeObjectURL(this.state.previewUrl);this.state.previewUrl=""}},

  data(){return{productId:this.state.editingId,productName:this.elements.name.value.trim(),description:this.elements.description.value.trim(),category:this.elements.category.value,foodType:this.elements.foodType.value,price:Number(this.elements.price.value),portion:this.elements.portion.value.trim(),preparationTimeMinutes:Number(this.elements.prep.value),keywords:this.elements.keywords.value.split(",").map(x=>x.trim()).filter(Boolean),offerEligible:this.elements.offer.checked}},
  validate(d,file){if(d.productName.length<2)return"Enter the product name.";if(d.description.length<5)return"Enter a short product description.";if(!d.category)return"Select a category.";if(!d.foodType)return"Select Veg or Non-Veg.";if(!Number.isFinite(d.price)||d.price<1)return"Enter a valid price.";if(!Number.isFinite(d.preparationTimeMinutes)||d.preparationTimeMinutes<1||d.preparationTimeMinutes>1440)return"Enter a valid preparation time.";if(!d.portion)return"Enter the portion or serving size.";if(!d.productId&&!file)return"Select a product image.";if(file&&!this.IMAGE_TYPES.includes(file.type))return"Upload a JPG, PNG or WebP image.";if(file&&(file.size<1||file.size>this.MAX_IMAGE_BYTES))return"Product image must be 2 MB or smaller.";return""},

  async save(){
    if(this.state.saving)return;const product=this.data(),file=this.elements.image.files[0],message=this.validate(product,file);if(message){this.showFormError(message);return}
    this.state.saving=true;this.elements.save.disabled=true;this.elements.save.textContent="Saving Product...";this.clearFormError();
    try{if(file){const encoded=await this.fileToBase64(file);product.fileName=file.name;product.mimeType=file.type;product.base64Data=encoded}const r=await API.request("save_food_partner_product",{sessionId:this.sessionId(),product});this.closeForm(true);await this.load();return{success:true,result:r.data}}
    catch(e){this.showFormError(e.message||"Product could not be saved.");return{success:false,error:e.message,code:e.code||""}}
    finally{this.state.saving=false;this.elements.save.disabled=false;this.elements.save.textContent=this.state.editingId?"Update Product":"Save Product"}
  },

  async toggleAvailability(p){const next=String(p.availabilityStatus).toUpperCase()==="AVAILABLE"?"OUT_OF_STOCK":"AVAILABLE";try{await API.request("set_food_partner_product_availability",{sessionId:this.sessionId(),productId:p.productId,availabilityStatus:next});p.availabilityStatus=next;this.render();return{success:true,status:next}}catch(e){this.elements.error.textContent=e.message||"Availability could not be changed.";this.elements.error.classList.remove("hidden");return{success:false,error:e.message}}},
  fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||"").split(",")[1]||"");reader.onerror=()=>reject(new Error("Product image could not be read."));reader.readAsDataURL(file)})},
  showFormError(m){this.elements.formError.textContent=m;this.elements.formError.classList.remove("hidden");this.elements.formError.scrollIntoView({behavior:"smooth",block:"nearest"})},clearFormError(){this.elements.formError.textContent="";this.elements.formError.classList.add("hidden")},money(v){const n=Number(v||0);return Number.isInteger(n)?String(n):n.toFixed(2)},bytes(v){return Number(v)<1024?Number(v)+" B":(Number(v)/1024/1024).toFixed(2)+" MB"},

  async test(){
    console.log("========================================\nAPNABITE FOOD PARTNER PRODUCTS TEST\n========================================");let data=null;try{const r=await API.request("get_food_partner_products",{sessionId:this.sessionId()});data=r.data||null}catch(e){data=null}
    const results=[{test:"Required role",expected:"Food Partner",actual:document.body.dataset.requiredRole,passed:document.body.dataset.requiredRole==="Food Partner"},{test:"Live product API",expected:true,actual:Boolean(data&&data.success===true),passed:Boolean(data&&data.success===true)},{test:"Product array",expected:true,actual:Boolean(data&&Array.isArray(data.products)),passed:Boolean(data&&Array.isArray(data.products))},{test:"Approved partner gate",expected:"APPROVED",actual:data&&data.partner?data.partner.approvalStatus:"",passed:Boolean(data&&data.partner&&data.partner.approvalStatus==="APPROVED")},{test:"2 MB image limit",expected:2097152,actual:this.MAX_IMAGE_BYTES,passed:this.MAX_IMAGE_BYTES===2097152},{test:"Add/edit controls",expected:true,actual:Boolean(this.elements.form&&this.elements.save),passed:Boolean(this.elements.form&&this.elements.save)}];const passed=results.every(x=>x.passed);console.table(results);console.log(passed?"Food Partner Products Test: PASS":"Food Partner Products Test: FAIL");return{success:passed,status:passed?"PASS":"FAIL",productCount:data&&Array.isArray(data.products)?data.products.length:0,results};
  }
};

document.addEventListener("DOMContentLoaded",()=>FoodPartnerProducts.init());
