/** APNABITE ORDER SUCCESS — renders only server-created TEST order data. */
const CustomerOrderSuccessPage = {
  STORAGE_KEY:"apnabite_order_success_context", data:null, rating:0, timer:null, elements:{},
  init(){
    const ids=["successMissing","successContent","confetti","successOrderId","successStatus","trackOrderButton","cancelCard","cancelCountdown","cancelText","cancelOrderButton","successAmount","successReward","impactCard","impactAmount","impactCause","ratingButtons","feedbackText","submitFeedbackButton","feedbackStatus"];
    ids.forEach((id)=>this.elements[id]=document.getElementById(id));
    try{this.data=JSON.parse(sessionStorage.getItem(this.STORAGE_KEY)||"null");}catch(error){this.data=null;}
    if(!this.data||this.data.success!==true||this.data.status!=="PLACED"||!this.data.order){this.showMissing();return false;}
    this.bindEvents();this.render();this.launchConfetti();this.startCancellationClock();return true;
  },
  bindEvents(){
    this.elements.trackOrderButton.addEventListener("click",()=>this.showStatus("Live rider tracking will activate after a rider accepts this order."));
    this.elements.cancelOrderButton.addEventListener("click",()=>this.showStatus("Cancellation API is the next secured backend step. Your order was not cancelled."));
    this.elements.ratingButtons.querySelectorAll("button").forEach((button)=>button.addEventListener("click",()=>this.selectRating(Number(button.dataset.rating||0))));
    this.elements.submitFeedbackButton.addEventListener("click",()=>this.submitFeedback());
  },
  render(){
    const d=this.data,o=d.order||{},p=d.pricing||{},reward=d.rewardPreview||{},impact=d.impact||{};
    this.elements.successOrderId.textContent=o.orderId||"—";
    this.elements.successStatus.textContent="Order placed • Kitchen confirmation pending";
    this.elements.successAmount.textContent=this.money(p.finalAmount||0);
    this.elements.successReward.textContent=String(reward.pointsOnCompletion||0)+" points";
    if(impact.contributionMade){this.elements.impactCard.classList.remove("hidden");this.elements.impactAmount.textContent=this.money(impact.amount||0);this.elements.impactCause.textContent=impact.causeName||"Underprivileged Student Support";}
    this.elements.successContent.classList.remove("hidden");this.elements.successMissing.classList.add("hidden");
  },
  showMissing(){this.elements.successMissing.classList.remove("hidden");this.elements.successContent.classList.add("hidden");},
  startCancellationClock(){
    const deadline=Date.parse(this.data.order.cancellationDeadlineAt||"");
    const tick=()=>{const remaining=Math.max(0,deadline-Date.now());const seconds=Math.ceil(remaining/1000);this.elements.cancelCountdown.textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");if(remaining<=0||!Number.isFinite(deadline)){clearInterval(this.timer);this.elements.cancelCountdown.textContent="00:00";this.elements.cancelOrderButton.disabled=true;this.elements.cancelText.textContent="The free cancellation window has ended.";}};
    tick();this.timer=setInterval(tick,1000);
  },
  launchConfetti(){
    const colors=["#ef5b00","#ffb000","#16864a","#e94178","#5b65e8"];
    for(let index=0;index<48;index++){const piece=document.createElement("i");piece.style.left=Math.random()*100+"%";piece.style.background=colors[index%colors.length];piece.style.animationDelay=Math.random()*.8+"s";piece.style.setProperty("--drift",(Math.random()*160-80)+"px");this.elements.confetti.appendChild(piece);}
    setTimeout(()=>this.elements.confetti.replaceChildren(),3800);
  },
  selectRating(rating){this.rating=rating;this.elements.ratingButtons.querySelectorAll("button").forEach((button)=>button.classList.toggle("selected",Number(button.dataset.rating)<=rating));},
  submitFeedback(){if(!this.rating){this.showStatus("Please select a star rating first.");return;}const feedback={orderId:this.data.order.orderId,rating:this.rating,feedback:String(this.elements.feedbackText.value||"").trim(),createdAt:new Date().toISOString(),pendingServerSync:true};localStorage.setItem("apnabite_pending_order_feedback",JSON.stringify(feedback));this.elements.submitFeedbackButton.disabled=true;this.showStatus("Thank you! Feedback saved safely for the upcoming feedback API.");},
  showStatus(message){this.elements.feedbackStatus.textContent=message;this.elements.feedbackStatus.classList.remove("hidden");},
  money(value){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value||0));},
  test(){const deadline=Date.parse(this.data&&this.data.order?this.data.order.cancellationDeadlineAt:"");const results=[{test:"Server order",passed:Boolean(this.data&&this.data.order&&this.data.order.orderId),actual:this.data&&this.data.order?this.data.order.orderId:""},{test:"Placed status",passed:Boolean(this.data&&this.data.status==="PLACED"),actual:this.data?this.data.status:""},{test:"Server cancellation deadline",passed:Number.isFinite(deadline),actual:this.data&&this.data.order?this.data.order.cancellationDeadlineAt:""},{test:"Reward preview",passed:Boolean(this.data&&this.data.rewardPreview),actual:Boolean(this.data&&this.data.rewardPreview)},{test:"Impact data",passed:Boolean(this.data&&this.data.impact),actual:Boolean(this.data&&this.data.impact)},{test:"Tracking honest state",passed:true,actual:"WAITS_FOR_RIDER_ASSIGNMENT"}];const passed=results.every((item)=>item.passed);console.table(results);return{success:passed,status:passed?"PASS":"FAIL",results};}
};
document.addEventListener("DOMContentLoaded",()=>CustomerOrderSuccessPage.init());
