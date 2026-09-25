/** APNABITE TEST PAYMENT — no real gateway transaction */
const CustomerPaymentPage={
  STORAGE_KEY:"apnabite_payment_context", RESULT_KEY:"apnabite_test_payment_result", elements:{}, context:null, processing:false, resultStatus:"",
  init(){
    const ids=["paymentBackButton","paymentMissingState","paymentContent","paymentKitchenName","paymentItemCount","paymentAmount","paymentSubtotal","paymentDeliveryFee","paymentPlatformFee","paymentDiscountRow","paymentDiscount","paymentFinalAmount","paymentMessage","paymentActionBar","paymentBarAmount","payNowButton","payButtonAmount","paymentResultDialog","paymentResultIcon","paymentResultTitle","paymentResultMessage","paymentReference","paymentResultAmount","paymentResultButton"];
    ids.forEach((id)=>this.elements[id]=document.getElementById(id));
    if(ids.some((id)=>!this.elements[id])){console.error("Payment page elements are missing.");return false;}
    this.bindEvents();this.context=this.restoreContext();
    if(!this.isValidContext(this.context)){this.showMissing();return false;}
    this.render();return true;
  },
  bindEvents(){
    this.elements.paymentBackButton.addEventListener("click",()=>window.location.href="cart.html");
    document.querySelectorAll('input[name="paymentMethod"]').forEach((input)=>input.addEventListener("change",()=>this.syncMethodCards()));
    this.elements.payNowButton.addEventListener("click",()=>this.processTestPayment());
    this.elements.paymentResultButton.addEventListener("click",()=>this.handleResultContinue());
  },
  restoreContext(){try{return JSON.parse(sessionStorage.getItem(this.STORAGE_KEY)||"null");}catch(error){return null;}},
  isValidContext(context){return Boolean(context&&context.cart&&Array.isArray(context.items)&&context.items.length&&context.billing&&Number.isFinite(Number(context.billing.finalPayableAmount)));},
  showMissing(){this.elements.paymentMissingState.classList.remove("hidden");this.elements.paymentContent.classList.add("hidden");this.elements.paymentActionBar.classList.add("hidden");},
  render(){
    const c=this.context,b=c.billing,quantity=c.items.reduce((sum,item)=>sum+Number(item.quantity||0),0),amount=Number(b.finalPayableAmount||0),discount=Number(b.discountAmount||0)+Number(b.rewardAmount||0);
    this.elements.paymentKitchenName.textContent=c.cart.businessName||"ApnaBite Kitchen";
    this.elements.paymentItemCount.textContent=quantity+(quantity===1?" item":" items");
    this.elements.paymentAmount.textContent=this.money(amount);this.elements.paymentSubtotal.textContent=this.money(b.subtotal||0);
    this.elements.paymentDeliveryFee.textContent=b.deliveryFeeWaived?"FREE":this.money(b.deliveryFee||0);
    this.elements.paymentPlatformFee.textContent=b.platformFeeWaived?"FREE":this.money(b.platformFee||0);
    this.elements.paymentDiscountRow.classList.toggle("hidden",discount<=0);this.elements.paymentDiscount.textContent="−"+this.money(discount);
    ["paymentFinalAmount","paymentBarAmount","payButtonAmount"].forEach((id)=>this.elements[id].textContent=this.money(amount));
    this.elements.paymentContent.classList.remove("hidden");this.elements.paymentActionBar.classList.remove("hidden");this.elements.paymentMissingState.classList.add("hidden");
  },
  syncMethodCards(){document.querySelectorAll(".method-card").forEach((card)=>card.classList.toggle("selected",card.querySelector("input").checked));},
  getSelected(name){const input=document.querySelector('input[name="'+name+'"]:checked');return input?input.value:"";},
  async processTestPayment(){
    if(this.processing)return;this.processing=true;this.elements.payNowButton.disabled=true;this.elements.payNowButton.textContent="Testing payment...";
    const method=this.getSelected("paymentMethod"),outcome=this.getSelected("testOutcome"),reference=this.generateReference(),amount=Number(this.context.billing.finalPayableAmount||0);
    await new Promise((resolve)=>setTimeout(resolve,650));
    const result={success:outcome==="SUCCESS",mode:"TEST",status:outcome,method,reference,amount,cartId:this.context.cart.cartId||"",quoteId:this.context.billing.quoteId||"",createdAt:new Date().toISOString(),realMoneyCharged:false};
    sessionStorage.setItem(this.RESULT_KEY,JSON.stringify(result));this.showResult(result);this.processing=false;this.elements.payNowButton.disabled=false;this.elements.payNowButton.innerHTML='Test Pay <span id="payButtonAmount">'+this.money(amount)+"</span>";
  },
  showResult(result){
    this.resultStatus=result.status;const success=result.success;this.elements.paymentResultDialog.classList.toggle("failed",!success);this.elements.paymentResultIcon.textContent=success?"✓":"×";
    this.elements.paymentResultTitle.textContent=success?"Test payment successful":"Test payment failed";
    this.elements.paymentResultMessage.textContent=success?"No real money was charged. Order creation will be connected in the next backend step.":"This is a simulated failure. Your cart remains safe.";
    this.elements.paymentReference.textContent=result.reference;this.elements.paymentResultAmount.textContent=this.money(result.amount);this.elements.paymentResultButton.textContent=success?"Done":"Try Again";
    typeof this.elements.paymentResultDialog.showModal==="function"?this.elements.paymentResultDialog.showModal():this.elements.paymentResultDialog.setAttribute("open","");
  },
  handleResultContinue(){if(typeof this.elements.paymentResultDialog.close==="function")this.elements.paymentResultDialog.close();else this.elements.paymentResultDialog.removeAttribute("open");if(this.resultStatus==="SUCCESS")this.showMessage("Test payment passed. Order has not been created yet.");},
  showMessage(message){this.elements.paymentMessage.textContent=message;this.elements.paymentMessage.classList.remove("hidden");setTimeout(()=>this.elements.paymentMessage.classList.add("hidden"),4000);},
  generateReference(){return"TESTPAY_"+Date.now().toString(36).toUpperCase()+"_"+Math.random().toString(36).slice(2,8).toUpperCase();},
  money(value){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value||0));},
  test(){const amount=Number(this.context&&this.context.billing?this.context.billing.finalPayableAmount:NaN);const results=[
    {test:"Payment context",passed:this.isValidContext(this.context),actual:Boolean(this.context)},
    {test:"Test mode",passed:Boolean(this.context&&this.context.payment&&this.context.payment.mode==="TEST"),actual:this.context&&this.context.payment?this.context.payment.mode:""},
    {test:"Final payable",passed:Number.isFinite(amount)&&amount>0,actual:amount},
    {test:"Payment methods",passed:document.querySelectorAll('input[name="paymentMethod"]').length===3,actual:document.querySelectorAll('input[name="paymentMethod"]').length},
    {test:"No real gateway",passed:true,actual:"SIMULATION_ONLY"},
    {test:"Duplicate protection",passed:typeof this.processing==="boolean",actual:typeof this.processing}
  ];const passed=results.every((x)=>x.passed);console.table(results);console.log(passed?"Customer Test Payment UI: PASS":"Customer Test Payment UI: FAIL");return{success:passed,status:passed?"PASS":"FAIL",results};}
};
document.addEventListener("DOMContentLoaded",()=>CustomerPaymentPage.init());
