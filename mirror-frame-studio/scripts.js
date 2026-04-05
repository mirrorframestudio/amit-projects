// ========== PAGE LOADER ==========
window.addEventListener('load',()=>{
  const loader=document.getElementById('page-loader');
  if(loader){setTimeout(()=>loader.classList.add('hidden'),600);setTimeout(()=>loader.remove(),1200)}
});

// ========== PARTICLES + MIRROR SHARDS ==========
(function(){
  const c=document.getElementById('particles');
  // Gold particles
  for(let i=0;i<8;i++){
    const p=document.createElement('div');
    p.className='particle';
    p.style.left=Math.random()*100+'%';
    p.style.animationDelay=Math.random()*8+'s';
    p.style.animationDuration=(6+Math.random()*6)+'s';
    p.style.width=p.style.height=(2+Math.random()*4)+'px';
    c.appendChild(p);
  }
  // Floating mirror shards
  for(let i=0;i<4;i++){
    const s=document.createElement('div');
    s.className='shard';
    const size=10+Math.random()*30;
    s.style.width=size+'px';
    s.style.height=(size*(.5+Math.random()*.8))+'px';
    s.style.left=Math.random()*100+'%';
    s.style.bottom='-50px';
    s.style.animationDelay=Math.random()*12+'s';
    s.style.animationDuration=(12+Math.random()*10)+'s';
    s.style.borderRadius=(2+Math.random()*6)+'px';
    c.appendChild(s);
  }
})();

// ========== NAVBAR SCROLL ==========
const navbar=document.getElementById('navbar');
const sections=document.querySelectorAll('section[id]');
const navLinks=document.querySelectorAll('.nav-links a:not(.nav-cta)');

window.addEventListener('scroll',()=>{
  // Navbar background
  navbar.classList.toggle('scrolled',window.scrollY>80);

  // Scroll progress
  const scrollTop=window.scrollY;
  const docHeight=document.documentElement.scrollHeight-window.innerHeight;
  const scrollPercent=(scrollTop/docHeight)*100;
  document.getElementById('scroll-progress').style.width=scrollPercent+'%';

  // Active nav link
  let current='';
  sections.forEach(s=>{
    const top=s.offsetTop-120;
    if(scrollTop>=top)current=s.getAttribute('id');
  });
  navLinks.forEach(a=>{
    a.classList.remove('active');
    if(a.getAttribute('href')==='#'+current)a.classList.add('active');
  });
},{passive:true});

// ========== MOBILE MENU ==========
function toggleMobileMenu(){
  const h=document.getElementById('nav-hamburger');
  const o=document.getElementById('mobile-overlay');
  h.classList.toggle('open');
  o.classList.toggle('open');
  const isOpen=o.classList.contains('open');
  document.body.style.overflow=isOpen?'hidden':'';
  h.setAttribute('aria-expanded',isOpen?'true':'false');
  h.setAttribute('aria-label',isOpen?'סגור תפריט':'פתח תפריט');
}
function closeMobileMenu(){
  document.getElementById('nav-hamburger').classList.remove('open');
  document.getElementById('mobile-overlay').classList.remove('open');
  document.body.style.overflow='';
}

// ========== SCROLL REVEAL (all animation types) ==========
const observer=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}});
},{threshold:0.15});
document.querySelectorAll('.reveal,.reveal-3d,.reveal-3d-left,.reveal-flip,.reveal-zoom,.reveal-card-3d').forEach(el=>observer.observe(el));

// Stagger animation delays for reveal-card-3d
document.querySelectorAll('.reveal-card-3d').forEach((el,i)=>{
  el.style.transitionDelay=(i*0.12)+'s';
});

// ========== COUNTER ANIMATION ==========
let counterDone=false;
const mathObserver=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting&&!counterDone){
      counterDone=true;
      document.querySelectorAll('.counter-num').forEach(el=>{
        const target=parseInt(el.dataset.target);
        const suffix=el.dataset.suffix||'';
        const duration=1500;
        const start=performance.now();
        function tick(now){
          const elapsed=now-start;
          const progress=Math.min(elapsed/duration,1);
          const eased=1-Math.pow(1-progress,3);
          const current=Math.round(target*eased);
          el.textContent=current+suffix;
          if(progress<1)requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }
  });
},{threshold:0.3});
const mathEq=document.getElementById('math-equation');
if(mathEq)mathObserver.observe(mathEq);

// ========== 3D TILT ON MOUSE (desktop) ==========
document.querySelectorAll('.tilt-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    const rect=card.getBoundingClientRect();
    const x=e.clientX-rect.left;
    const y=e.clientY-rect.top;
    const centerX=rect.width/2;
    const centerY=rect.height/2;
    const rotateX=((y-centerY)/centerY)*-6;
    const rotateY=((x-centerX)/centerX)*6;
    card.style.transform=`perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
  });
  card.addEventListener('mouseleave',()=>{
    card.style.transform='';
  });
});

// ========== EDITOR IPHONE 3D TILT ==========
const editorArea=document.querySelector('.mirror-preview-area');
const iphoneShell=document.querySelector('.iphone-shell');
if(editorArea&&iphoneShell){
  editorArea.style.perspective='900px';
  editorArea.addEventListener('mousemove',e=>{
    const rect=editorArea.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width-.5;
    const y=(e.clientY-rect.top)/rect.height-.5;
    iphoneShell.style.transform=`rotateY(${x*10}deg) rotateX(${-y*6}deg)`;
    iphoneShell.style.transition='transform .1s ease-out';
  });
  editorArea.addEventListener('mouseleave',()=>{
    iphoneShell.style.transform='';
    iphoneShell.style.transition='transform .5s ease-out';
  });
}

// ========== HERO MIRROR 3D TILT ==========
const heroImg=document.querySelector('.hero-insta-frame')||document.querySelector('.hero-mirror-img');
if(heroImg){
  const heroSide=document.querySelector('.hero-mirror-side');
  heroSide.style.perspective='800px';
  heroSide.addEventListener('mousemove',e=>{
    const rect=heroSide.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width-.5;
    const y=(e.clientY-rect.top)/rect.height-.5;
    heroImg.style.transform=`rotateY(${x*18}deg) rotateX(${-y*12}deg)`;
    heroImg.style.transition='transform .1s ease-out';
  });
  heroSide.addEventListener('mouseleave',()=>{
    heroImg.style.transform='';
    heroImg.style.transition='transform .5s ease-out';
  });
}

// ========== TESTIMONIALS (placeholder — no slider needed) ==========

// ========== FAQ ACCORDION ==========
function toggleFaq(item){
  const wasOpen=item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item').forEach(i=>{
    i.classList.remove('open');
    i.querySelector('.faq-answer').style.maxHeight=null;
    const q=i.querySelector('.faq-question');
    if(q)q.setAttribute('aria-expanded','false');
  });
  // Open clicked (if it wasn't open)
  if(!wasOpen){
    item.classList.add('open');
    const answer=item.querySelector('.faq-answer');
    answer.style.maxHeight=answer.scrollHeight+'px';
    const q=item.querySelector('.faq-question');
    if(q)q.setAttribute('aria-expanded','true');
  }
}

// ========== ROI CALCULATOR ==========
const _roiPrev={posts:0,views:0,monthly:0,money:0};
const _roiAnims={};
function animateValue(el,from,to,duration,prefix,suffix){
  prefix=prefix||'';suffix=suffix||'';
  if(_roiAnims[el.id]){cancelAnimationFrame(_roiAnims[el.id])}
  if(from===to){el.textContent=prefix+to.toLocaleString()+suffix;return;}
  const start=performance.now();
  const diff=to-from;
  function tick(now){
    const elapsed=now-start;
    const progress=Math.min(elapsed/duration,1);
    // ease-out cubic
    const eased=1-Math.pow(1-progress,3);
    const current=Math.round(from+diff*eased);
    el.textContent=prefix+current.toLocaleString()+suffix;
    if(progress<1){_roiAnims[el.id]=requestAnimationFrame(tick)}
    else{delete _roiAnims[el.id]}
  }
  _roiAnims[el.id]=requestAnimationFrame(tick);
}
function calcROI(){
  const customers=parseInt(document.getElementById('roi-customers').value)||0;
  const days=parseInt(document.getElementById('roi-days').value)||0;
  const pct=parseInt(document.getElementById('roi-pct').value)||0;
  const followers=parseInt(document.getElementById('roi-followers').value)||0;
  document.getElementById('roi-pct-label').textContent=pct+'%';
  document.getElementById('roi-followers-label').textContent=followers.toLocaleString();
  const postsWeek=Math.round(customers*days*(pct/100));
  const viewsWeek=postsWeek*followers;
  const viewsMonth=viewsWeek*4;
  // CPM ~30 ILS average for Instagram in Israel
  const moneyValue=Math.round(viewsMonth/1000*30);
  const dur=400;
  animateValue(document.getElementById('roi-posts'),_roiPrev.posts,postsWeek,dur);
  animateValue(document.getElementById('roi-views'),_roiPrev.views,viewsWeek,dur);
  animateValue(document.getElementById('roi-monthly'),_roiPrev.monthly,viewsMonth,dur);
  animateValue(document.getElementById('roi-money'),_roiPrev.money,moneyValue,dur,'₪');
  _roiPrev.posts=postsWeek;_roiPrev.views=viewsWeek;_roiPrev.monthly=viewsMonth;_roiPrev.money=moneyValue;
}
calcROI();

// ========== MIRROR EDITOR ==========
let ledColor='warm';
function updateCustomSize(){
  const w=parseInt(document.getElementById('ed-width').value)||50;
  const h=parseInt(document.getElementById('ed-height').value)||60;
  document.getElementById('mirror-size-label').textContent=w+'×'+h+' ס״מ';
}

function updateMirror(){
  const dn=document.getElementById('ed-displayname').value;
  const un=document.getElementById('ed-username').value;
  const loc=document.getElementById('ed-location').value;
  const verified=document.getElementById('ed-verified').checked;
  const likes=document.getElementById('ed-likes').value;
  const comments=document.getElementById('ed-comments').value;
  const caption=document.getElementById('ed-caption').value;
  const ledOn=document.getElementById('ed-led').checked;
  const qrOn=document.getElementById('ed-qr').checked;

  document.getElementById('mirror-displayname').textContent=dn;
  document.getElementById('mirror-username').textContent=un;
  document.getElementById('mirror-location').textContent=loc;
  document.getElementById('mirror-verified').style.display=verified?'inline':'none';
  document.getElementById('mirror-likes').textContent=likes;
  document.getElementById('mirror-comments-count').textContent=comments;
  document.getElementById('mirror-caption').textContent=caption;

  // LED glow on the mirror surface
  const ledEl=document.getElementById('mirror-led');
  document.getElementById('led-options').style.display=ledOn?'block':'none';
  if(ledOn){
    const colors={warm:'rgba(255,170,68,.6)',neutral:'rgba(255,240,200,.6)',cool:'rgba(160,196,255,.6)'};
    const glows={warm:'rgba(255,136,0,.3)',neutral:'rgba(255,224,160,.3)',cool:'rgba(100,160,255,.3)'};
    ledEl.style.boxShadow=`inset 0 0 30px 10px ${colors[ledColor]}, 0 0 40px 10px ${glows[ledColor]}`;
  }else{
    ledEl.style.boxShadow='none';
  }

  // QR
  document.getElementById('mirror-qr').style.display=qrOn?'flex':'none';
}

function setLed(color){
  ledColor=color;
  document.querySelectorAll('.led-color-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.led-color-btn[data-color="${color}"]`).classList.add('active');
  updateMirror();
}

function handlePhoto(e){
  const file=e.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(ev){
    const img=document.getElementById('avatar-img');
    img.src=ev.target.result;
    img.style.display='block';
    document.getElementById('avatar-placeholder').style.display='none';
  };
  reader.readAsDataURL(file);
}

// ========== MULTI-STEP FORM ==========
const SHEETS_URL='https://script.google.com/macros/s/AKfycbwwb4GYpXtdg-X3QnlN5iZz4wBw3yZOGsf4Am5pQ7jiRCCGJLbJ_Ro--qIWtsrOTkhZMg/exec';
let currentFormStep=1;

function selectBizType(card){
  document.querySelectorAll('.biz-type-card').forEach(c=>c.classList.remove('selected'));
  card.classList.add('selected');
  document.getElementById('form-type').value=card.dataset.value;
}

function updateFormProgress(step){
  for(let i=1;i<=3;i++){
    const fp=document.getElementById('fp-'+i);
    fp.classList.remove('active','done');
    if(i<step)fp.classList.add('done');
    if(i===step)fp.classList.add('active');
  }
  for(let i=1;i<=2;i++){
    const fl=document.getElementById('fl-'+i);
    fl.classList.toggle('done',i<step);
  }
  const counter=document.getElementById('form-step-counter');
  if(step<=3)counter.textContent='שלב '+step+' מתוך 3';
  else counter.style.display='none';
}

function shakeForm(stepEl){
  stepEl.classList.add('form-shake');
  setTimeout(()=>stepEl.classList.remove('form-shake'),400);
}

function nextStep(step){
  const currentStepEl=document.getElementById('form-step-'+currentFormStep);
  // Validation
  if(currentFormStep===1){
    if(!document.getElementById('form-type').value){
      shakeForm(currentStepEl);
      return;
    }
  }
  if(currentFormStep===2){
    const biz=document.getElementById('form-business').value.trim();
    const name=document.getElementById('form-name').value.trim();
    if(!biz||!name){
      if(!biz)document.getElementById('form-business').classList.add('input-error');
      if(!name)document.getElementById('form-name').classList.add('input-error');
      shakeForm(currentStepEl);
      setTimeout(()=>{
        document.getElementById('form-business').classList.remove('input-error');
        document.getElementById('form-name').classList.remove('input-error');
      },500);
      return;
    }
  }
  currentStepEl.classList.remove('active');
  currentFormStep=step;
  document.getElementById('form-step-'+step).classList.add('active');
  updateFormProgress(step);
}

function prevStep(step){
  document.getElementById('form-step-'+currentFormStep).classList.remove('active');
  currentFormStep=step;
  document.getElementById('form-step-'+step).classList.add('active');
  updateFormProgress(step);
}

function handleMultiStepSubmit(e){
  e.preventDefault();
  const phone=document.getElementById('form-phone').value.trim();
  if(!phone||phone.length<9){
    document.getElementById('form-phone').classList.add('input-error');
    shakeForm(document.getElementById('form-step-3'));
    setTimeout(()=>document.getElementById('form-phone').classList.remove('input-error'),500);
    return;
  }

  const business=document.getElementById('form-business').value;
  const name=document.getElementById('form-name').value;
  const email=document.getElementById('form-email').value;
  const typeVal=document.getElementById('form-type').value;
  const typeLabels={salon:'סלון יופי',pilates:'פילאטיס / יוגה',cafe:'בית קפה / מסעדה',boutique:'בוטיק אופנה',gym:'חדר כושר',other:'אחר'};
  const typeText=typeLabels[typeVal]||typeVal;

  // Store in localStorage as backup
  const leads=JSON.parse(localStorage.getItem('mirror_leads')||'[]');
  leads.push({business,name,phone,email,type:typeVal,timestamp:new Date().toISOString()});
  localStorage.setItem('mirror_leads',JSON.stringify(leads));

  // Send to Google Sheets via hidden form
  if(SHEETS_URL&&!SHEETS_URL.startsWith('REPLACE')){
    var iframe=document.createElement('iframe');
    iframe.name='sheets_iframe';iframe.style.display='none';
    document.body.appendChild(iframe);
    var f=document.createElement('form');
    f.method='POST';f.action=SHEETS_URL;f.target='sheets_iframe';
    ['business','name','phone','email','type','timestamp'].forEach(function(k){
      var inp=document.createElement('input');inp.type='hidden';inp.name=k;
      inp.value={business:business,name:name,phone:phone,email:email,type:typeText,timestamp:new Date().toISOString()}[k];
      f.appendChild(inp);
    });
    document.body.appendChild(f);f.submit();
    setTimeout(function(){iframe.remove();f.remove();},5000);
  }

  // Meta Pixel: Lead event
  if(typeof fbq==='function') fbq('track','Lead',{content_name:business,content_category:typeText});

  // Show thank you step
  document.getElementById('lead-form').style.display='none';
  document.getElementById('form-step-4').classList.add('active');
  document.getElementById('form-progress').style.display='none';
  document.getElementById('form-step-counter').style.display='none';

  // Open WhatsApp immediately with full details
  const emailLine=email?`\nאימייל: ${email}`:'';
  const msg=encodeURIComponent(`היי, אני מתעניין/ת במראה ממותגת\n\nשם העסק: ${business}\nשם: ${name}\nטלפון: ${phone}${emailLine}\nסוג עסק: ${typeText}\n\nאשמח לשמוע פרטים נוספים!`);
  window.open(`https://wa.me/972503755705?text=${msg}`,'_blank');
}

// ========== SCROLL TO TOP ==========
(function(){
  const btn=document.getElementById('scroll-top');
  if(!btn)return;
  window.addEventListener('scroll',()=>{
    btn.classList.toggle('visible',window.scrollY>600);
  },{passive:true});
})();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    const target=document.querySelector(a.getAttribute('href'));
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  });
});



// ========== WHATSAPP BUBBLE ==========
setTimeout(()=>{
  const bubble=document.getElementById('wa-bubble');
  if(bubble&&!localStorage.getItem('mirror_wa_bubble_closed')){
    bubble.classList.add('show');
    // Auto-hide after 8s
    setTimeout(()=>bubble.classList.remove('show'),8000);
  }
},10000);

// ========== MAGNETIC BUTTONS ==========
document.querySelectorAll('.btn-magnetic').forEach(btn=>{
  btn.addEventListener('mousemove',e=>{
    const rect=btn.getBoundingClientRect();
    const x=e.clientX-rect.left-rect.width/2;
    const y=e.clientY-rect.top-rect.height/2;
    btn.style.transform=`translate(${x*.2}px,${y*.2}px) scale(1.05)`;
  });
  btn.addEventListener('mouseleave',()=>{
    btn.style.transform='';
  });
});

// ========== PARALLAX ON SCROLL ==========
const parallaxElements=document.querySelectorAll('.hero-mirror-glow,.guarantee-icon');
window.addEventListener('scroll',()=>{
  const scrollY=window.scrollY;
  parallaxElements.forEach(el=>{
    const speed=parseFloat(el.dataset.speed)||0.15;
    const rect=el.getBoundingClientRect();
    if(rect.top<window.innerHeight&&rect.bottom>0){
      el.style.transform=`translateY(${scrollY*speed*-0.3}px)`;
    }
  });
},{passive:true});

// ========== STATS BAR COUNTER ANIMATION ==========
(function(){
  let statsDone=false;
  const statsObserver=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting&&!statsDone){
        statsDone=true;
        document.querySelectorAll('.stat-num').forEach(el=>{
          const target=parseInt(el.dataset.target);
          const suffix=el.dataset.suffix||'';
          if(target===0){el.textContent='0'+suffix;return}
          const duration=2000;
          const start=performance.now();
          function tick(now){
            const elapsed=now-start;
            const progress=Math.min(elapsed/duration,1);
            const eased=1-Math.pow(1-progress,3);
            const current=Math.round(target*eased);
            el.textContent=(target>=1000?current.toLocaleString():current)+suffix;
            if(progress<1)requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }
    });
  },{threshold:0.3});
  const statsBar=document.getElementById('stats-bar');
  if(statsBar)statsObserver.observe(statsBar);
})();

// ========== HERO TYPING EFFECT ==========
(function(){
  const words=['בשבילך','את הסלון שלך','את הסטודיו שלך','את בית הקפה שלך','את הבוטיק שלך'];
  const el=document.getElementById('hero-typing');
  if(!el)return;
  let wordIndex=0;
  let charIndex=words[0].length;
  let isDeleting=false;
  let pauseTime=2000;
  function type(){
    const currentWord=words[wordIndex];
    if(!isDeleting){
      charIndex++;
      el.textContent=currentWord.substring(0,charIndex);
      if(charIndex===currentWord.length){
        isDeleting=false;
        setTimeout(()=>{isDeleting=true;type()},pauseTime);
        return;
      }
      setTimeout(type,80);
    }else{
      charIndex--;
      el.textContent=currentWord.substring(0,charIndex);
      if(charIndex===0){
        isDeleting=false;
        wordIndex=(wordIndex+1)%words.length;
        setTimeout(type,400);
        return;
      }
      setTimeout(type,40);
    }
  }
  // Start after initial pause
  setTimeout(()=>{isDeleting=true;type()},2500);
})();




// ========== FAKE 3D ROTATION SYSTEM ==========
(function(){
  'use strict';

  const VH=()=>window.innerHeight;
  // Safety fallback: force all reveal elements visible after 4s if animation fails
  setTimeout(()=>{
    document.querySelectorAll('.reveal,.reveal-3d,.reveal-3d-left,.reveal-flip,.reveal-zoom,.reveal-card-3d,.reveal-soft,.anim-word').forEach(el=>{
      if(!el.classList.contains('visible'))el.classList.add('visible');
    });
  },4000);

  // ── SHARED OBSERVER for simple reveals ──
  const softObserver=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add('visible');softObserver.unobserve(e.target);}
    });
  },{threshold:0.08,rootMargin:'0px 0px -30px 0px'});

  // ── WORD-BY-WORD subtitle animation ──
  const wordObserver=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.querySelectorAll('.anim-word').forEach((w,i)=>setTimeout(()=>w.classList.add('visible'),i*42));
        wordObserver.unobserve(e.target);
      }
    });
  },{threshold:0.15,rootMargin:'0px 0px -30px 0px'});

  document.querySelectorAll('.section-subtitle').forEach(el=>{
    const nodes=Array.from(el.childNodes);
    el.innerHTML='';
    nodes.forEach(node=>{
      if(node.nodeType===3){
        node.textContent.split(/(\s+)/).forEach(chunk=>{
          if(/^\s+$/.test(chunk)){el.appendChild(document.createTextNode(chunk));}
          else if(chunk){const s=document.createElement('span');s.className='anim-word';s.textContent=chunk;el.appendChild(s);}
        });
      } else {el.appendChild(node.cloneNode(true));}
    });
    wordObserver.observe(el);
  });

  // Helper: run once via IntersectionObserver then unobserve
  function onceVisible(el,threshold,cb){
    const obs=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{if(e.isIntersecting){obs.unobserve(e.target);cb(e.target);}});
    },{threshold,rootMargin:'0px 0px -30px 0px'});
    obs.observe(el);
  }

  // ── STAGGER STATS (fake-3D flip, fires once) ──
  const statsBar=document.getElementById('stats-bar');
  if(statsBar){
    onceVisible(statsBar,0.2,(bar)=>{
      bar.querySelectorAll('.stat-item').forEach((item,i)=>{
        item.style.opacity='0';
        item.style.transform=`perspective(900px) rotateY(${i%2===0?-28:28}deg) scale(.9)`;
        item.style.transformOrigin=i%2===0?'0% 50%':'100% 50%';
        item.style.transition=`opacity .95s ${i*.13}s cubic-bezier(.16,1,.3,1),transform 1.2s ${i*.13}s cubic-bezier(.16,1,.3,1)`;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          item.style.opacity='1';
          item.style.transform='perspective(900px) rotateY(0deg) scale(1)';
        }));
      });
    });
  }

  // ── STAGGER GUARANTEE (fake-3D flip up, fires once) ──
  document.querySelectorAll('.guarantee-grid').forEach(grid=>{
    onceVisible(grid,0.15,(g)=>{
      g.querySelectorAll('.guarantee-item').forEach((item,i)=>{
        item.style.opacity='0';
        item.style.transform='perspective(900px) rotateX(30deg) scale(.92)';
        item.style.transformOrigin='50% 100%';
        item.style.transition=`opacity 1.05s ${i*.16}s cubic-bezier(.16,1,.3,1),transform 1.35s ${i*.16}s cubic-bezier(.16,1,.3,1)`;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          item.style.opacity='1';
          item.style.transform='perspective(900px) rotateX(0deg) scale(1)';
        }));
      });
    });
  });

  // ── GALLERY fake-3D stagger (alternating angles, fires once) ──
  document.querySelectorAll('.real-gallery').forEach(gallery=>{
    onceVisible(gallery,0.08,(g)=>{
      g.querySelectorAll('.real-gallery-item').forEach((item,i)=>{
        const fromLeft=i%2===0;
        item.style.opacity='0';
        item.style.transform=`perspective(1000px) rotateY(${fromLeft?-36:36}deg) scale(.87)`;
        item.style.transformOrigin=fromLeft?'0% 50%':'100% 50%';
        item.style.transition=`opacity 1.1s ${i*.12}s cubic-bezier(.16,1,.3,1),transform 1.45s ${i*.12}s cubic-bezier(.16,1,.3,1)`;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          item.style.opacity='1';
          item.style.transform='perspective(1000px) rotateY(0deg) scale(1)';
        }));
      });
    });
  });

  // ── TARGET CARDS fake-3D stagger (fires once) ──
  document.querySelectorAll('.target-grid').forEach(grid=>{
    onceVisible(grid,0.08,(g)=>{
      g.querySelectorAll('.target-card').forEach((card,i)=>{
        card.style.opacity='0';
        card.style.transform=`perspective(900px) rotateY(${i%2===0?-32:32}deg) scale(.88)`;
        card.style.transformOrigin=i%2===0?'0% 50%':'100% 50%';
        card.style.transition=`opacity 1.05s ${i*.11}s cubic-bezier(.16,1,.3,1),transform 1.35s ${i*.11}s cubic-bezier(.16,1,.3,1)`;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          card.style.opacity='1';
          card.style.transform='perspective(900px) rotateY(0deg) scale(1)';
        }));
      });
    });
  });

  // ── FAQ soft reveal ──
  document.querySelectorAll('.faq-item').forEach((item,i)=>{
    item.classList.add('reveal-soft');
    item.style.transitionDelay=(i*0.06)+'s';
    softObserver.observe(item);
  });

  // ── COMPARE TABLE rows — staggered slide-in + gold glow ──
  (function(){
    var rows=document.querySelectorAll('.compare-table tbody tr');
    if(!rows.length)return;
    rows.forEach(function(row,i){row.style.transitionDelay=(i*0.15)+'s';});
    var allVisible=false;
    var tableObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('row-visible');
          tableObserver.unobserve(entry.target);
          // Check if all rows are now visible
          if(!allVisible){
            var done=true;
            rows.forEach(function(r){if(!r.classList.contains('row-visible'))done=false;});
            if(done){
              allVisible=true;
              // Add gold glow pulse to highlight cells + header after last row animates
              var lastDelay=(rows.length-1)*0.15+0.7;
              setTimeout(function(){
                document.querySelectorAll('.compare-table td.highlight').forEach(function(td){
                  td.classList.add('glow-pulse');
                  td.addEventListener('animationend',function(){td.classList.remove('glow-pulse');},{once:true});
                });
                var mirrorHeader=document.querySelector('.compare-table th.col-mirror');
                if(mirrorHeader){mirrorHeader.classList.add('glow-pulse');mirrorHeader.addEventListener('animationend',function(){mirrorHeader.classList.remove('glow-pulse');},{once:true});}
              },lastDelay*1000);
            }
          }
        }
      });
    },{threshold:0.1});
    rows.forEach(function(row){tableObserver.observe(row);});
  })();

  // ── HERO BACKGROUND PARALLAX ──
  const heroBg=document.querySelector('.hero-video-bg');
  const heroSection=document.querySelector('.hero');
  if(heroBg&&heroSection){
    let t=false;
    window.addEventListener('scroll',()=>{
      if(!t){requestAnimationFrame(()=>{
        const s=window.scrollY,h=heroSection.offsetHeight;
        if(s<h*1.2)heroBg.style.transform=`translateY(${s*0.18}px)`;
        t=false;
      });t=true;}
    },{passive:true});
  }

  // ══════════════════════════════════════════════════════
  // ── CONTINUOUS FAKE-3D SCROLL ROTATION ──
  // Elements tilt based on their position in the viewport:
  //   entering from bottom → angled  →  center → flat  →  leaving top → opposite angle
  // This is the core "Fake 3D Rotation" effect from the Figma file.
  // ══════════════════════════════════════════════════════
  const live3dTargets=[];

  // Register targets for continuous scroll-driven fake-3D rotation.
  // These are elements that are ALWAYS visible (no entrance animation conflict).
  document.querySelectorAll('.flow-img img').forEach(img=>{
    img.classList.add('fake3d-live');
    live3dTargets.push({el:img,strength:16,axis:'Y',scaleRange:.06});
  });
  document.querySelectorAll('.proof-card').forEach(card=>{
    card.classList.add('fake3d-live');
    live3dTargets.push({el:card,strength:9,axis:'Y',scaleRange:.03});
  });
  const roiCard=document.querySelector('.roi-card');
  if(roiCard){
    roiCard.classList.add('fake3d-live');
    live3dTargets.push({el:roiCard,strength:7,axis:'X',scaleRange:.03});
  }
  document.querySelectorAll('.flow-node').forEach(node=>{
    node.classList.add('fake3d-live');
    live3dTargets.push({el:node,strength:20,axis:'Y',scaleRange:.07});
  });

  let scrollTicking=false;

  function applyFake3D(){
    const vh=VH();
    live3dTargets.forEach(({el,strength,axis,scaleRange})=>{
      const rect=el.getBoundingClientRect();
      if(rect.bottom<-100||rect.top>vh+100)return;

      // progress: -1 = element at bottom of viewport, 0 = element at center, +1 = element at top
      const centerY=rect.top+rect.height/2;
      const progress=(vh/2-centerY)/(vh*0.55);
      const p=Math.max(-1,Math.min(1,progress));

      const rot=p*strength;
      const scale=1-Math.abs(p)*scaleRange;

      if(axis==='Y'){
        el.style.transform=`perspective(900px) rotateY(${rot}deg) scale(${scale})`;
      } else {
        el.style.transform=`perspective(900px) rotateX(${-rot*0.6}deg) scale(${scale})`;
      }
    });
    scrollTicking=false;
  }

  window.addEventListener('scroll',()=>{
    if(!scrollTicking){requestAnimationFrame(applyFake3D);scrollTicking=true;}
  },{passive:true});

  // Run once on load
  setTimeout(applyFake3D,100);
})();

// ========== CURSOR GLOW FOLLOWER ==========
(function(){
  const glow=document.getElementById('cursor-glow');
  if(!glow||window.matchMedia('(max-width:768px)').matches)return;
  let mx=0,my=0,cx=0,cy=0,active=false;
  document.addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    if(!active){active=true;glow.classList.add('active');requestAnimationFrame(tick);}
  });
  document.addEventListener('mouseleave',()=>{active=false;glow.classList.remove('active');});
  function tick(){
    if(!active)return;
    cx+=(mx-cx)*.08;cy+=(my-cy)*.08;
    glow.style.left=cx+'px';glow.style.top=cy+'px';
    requestAnimationFrame(tick);
  }
})();

// ========== BUTTON RIPPLE EFFECT (Micro-interaction #7) ==========
document.querySelectorAll('.btn').forEach(btn=>{
  btn.addEventListener('click',function(e){
    const ripple=document.createElement('span');
    ripple.className='btn-ripple';
    const rect=this.getBoundingClientRect();
    const size=Math.max(rect.width,rect.height)*2;
    ripple.style.width=ripple.style.height=size+'px';
    ripple.style.left=(e.clientX-rect.left-size/2)+'px';
    ripple.style.top=(e.clientY-rect.top-size/2)+'px';
    this.appendChild(ripple);
    setTimeout(()=>ripple.remove(),600);
  });
});

// ========== FORM VALIDATION SHAKE (Micro-interaction #7) ==========
document.querySelectorAll('form').forEach(form=>{
  form.addEventListener('invalid',function(e){
    e.target.classList.add('input-error');
    setTimeout(()=>e.target.classList.remove('input-error'),500);
  },true);
});

// ========== HAMBURGER A11Y ==========
function toggleMobileMenuA11y(){
  const hamburger=document.getElementById('nav-hamburger');
  const isOpen=document.getElementById('mobile-overlay').classList.contains('open');
  hamburger.setAttribute('aria-expanded',isOpen?'true':'false');
  hamburger.setAttribute('aria-label',isOpen?'סגור תפריט':'פתח תפריט');
}
// Patch the existing toggleMobileMenu
const _origToggle=typeof toggleMobileMenu==='function'?toggleMobileMenu:null;
// We'll hook into the hamburger click below


// ========== PREMIUM 3D ANIMATIONS ==========
(function(){
  if(window.matchMedia('(max-width:768px)').matches) return;

  // ── Gallery items: individual mouse-follow 3D tilt ──
  document.querySelectorAll('.real-gallery-item').forEach(item=>{
    item.addEventListener('mousemove',e=>{
      const rect=item.getBoundingClientRect();
      const x=(e.clientX-rect.left)/rect.width-.5;
      const y=(e.clientY-rect.top)/rect.height-.5;
      item.style.transform=`perspective(800px) rotateY(${x*20}deg) rotateX(${-y*15}deg) scale(1.06)`;
      item.style.boxShadow=`${-x*30}px ${y*30}px 60px rgba(0,0,0,.3),0 0 30px rgba(200,168,75,.12)`;
    });
    item.addEventListener('mouseleave',()=>{
      item.style.transform='';
      item.style.boxShadow='';
    });
  });

  // ── Hero mirror: enhanced parallax with reflection ──
  const heroSide=document.querySelector('.hero-mirror-side');
  const heroImg=document.querySelector('.hero-insta-frame')||document.querySelector('.hero-mirror-img');
  if(heroSide&&heroImg){
    heroSide.addEventListener('mousemove',e=>{
      const rect=heroSide.getBoundingClientRect();
      const x=(e.clientX-rect.left)/rect.width-.5;
      const y=(e.clientY-rect.top)/rect.height-.5;
      heroImg.style.transform=`rotateY(${x*22}deg) rotateX(${-y*14}deg) translateZ(20px)`;
      heroImg.style.transition='transform .08s ease-out';
      // Move the reflection glint
      const glint=heroSide.querySelector('::after');
      heroSide.style.setProperty('--glint-x',`${50+x*40}%`);
      heroSide.style.setProperty('--glint-y',`${50+y*40}%`);
    });
    heroSide.addEventListener('mouseleave',()=>{
      heroImg.style.transform='';
      heroImg.style.transition='transform .6s cubic-bezier(.22,1,.36,1)';
    });
  }

  // ── Scroll-driven 3D depth for sections ──
  let ticking=false;
  function onScrollParallax(){
    const scrollY=window.scrollY;
    const vh=window.innerHeight;

    // Parallax depth on section elements
    document.querySelectorAll('.flow-step,.guarantee-item,.target-card,.stat-item').forEach(el=>{
      const rect=el.getBoundingClientRect();
      if(rect.top<vh&&rect.bottom>0){
        const progress=(vh-rect.top)/(vh+rect.height);
        const depth=Math.sin(progress*Math.PI)*12;
        const rotX=(progress-.5)*-4;
        el.style.transform=`perspective(1000px) translateZ(${depth}px) rotateX(${rotX}deg)`;
      }
    });

    // Hero video parallax
    const heroVideo=document.querySelector('.hero-video-bg');
    if(heroVideo&&scrollY<vh){
      heroVideo.style.transform=`translateY(${scrollY*.3}px) scale(${1+scrollY*0.0002})`;
    }

    ticking=false;
  }
  window.addEventListener('scroll',()=>{
    if(!ticking){ticking=true;requestAnimationFrame(onScrollParallax);}
  },{passive:true});

  // ── iPhone editor: gyroscope-like idle float ──
  const iphone=document.querySelector('.iphone-shell');
  if(iphone){
    let angle=0;
    function floatIphone(){
      angle+=0.008;
      const rotX=Math.sin(angle)*2;
      const rotY=Math.cos(angle*0.7)*3;
      const ty=Math.sin(angle*0.5)*4;
      // Only apply idle float if not being hovered
      if(!iphone.matches(':hover')&&!iphone.dataset.hovered){
        iphone.style.transform=`rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(${ty}px)`;
      }
      requestAnimationFrame(floatIphone);
    }
    floatIphone();
    const edArea=document.querySelector('.mirror-preview-area');
    if(edArea){
      edArea.addEventListener('mouseenter',()=>iphone.dataset.hovered='1');
      edArea.addEventListener('mouseleave',()=>{delete iphone.dataset.hovered;});
    }
  }

  // ── ROI result cards stagger pop ──
  const roiObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.querySelectorAll('.roi-result-card').forEach((card,i)=>{
          card.style.opacity='0';
          card.style.transform='perspective(600px) rotateY(20deg) scale(.8)';
          setTimeout(()=>{
            card.style.transition='all .6s cubic-bezier(.22,1,.36,1)';
            card.style.opacity='1';
            card.style.transform='';
          },i*120);
        });
        roiObserver.unobserve(entry.target);
      }
    });
  },{threshold:.3});
  const roiResults=document.querySelector('.roi-results');
  if(roiResults) roiObserver.observe(roiResults);

})();

// ========== FLOATING MIRROR BG — REMOVED ==========
(function(){
  return; // disabled

  let cur=0,target=0,running=false;
  const steps=['🪞 מראה גולמית','✏️ בחירת סקיצה','🖨️ הדפסת UV','💡 הרכבת LED','✅ מוכנה עבורך!'];

  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function lerp(a,b,t){return a+(b-a)*t}
  function sm(t){return t*t*(3-2*t)} // smoothstep
  function fade(p,s,e){return clamp(sm(clamp((p-s)/(e-s),0,1)),0,1)}

  function render(){
    const p=cur;

    // ── Hide during hero (first ~8% of page) ──
    const showAmount=fade(p,0.06,0.12);
    if(showAmount<=0){mirror.style.opacity='0';return;}

    // ── SIDE-TO-SIDE: slides off right edge, slides in from left edge ──
    const isMobile=window.innerWidth<768;
    const isSmall=window.innerWidth<480;
    const edgeR=isSmall?95:isMobile?92:93;   // resting position on right
    const edgeL=isSmall?5:isMobile?8:7;      // resting position on left
    const offR=108;               // off-screen right
    const offL=-8;                // off-screen left

    // Smooth slide path:
    // 8%-40%:  resting on right edge
    // 40%-50%: slides off-screen to the right (edgeR → offR)
    // 50%-60%: slides in from off-screen left (offL → edgeL)
    // 60%-100%: resting on left edge
    let x;
    if(p<0.40){
      x=edgeR;
    }else if(p<0.50){
      const t=fade(p,0.40,0.50);
      x=lerp(edgeR,offR,t);
    }else if(p<0.60){
      const t=fade(p,0.50,0.60);
      x=lerp(offL,edgeL,t);
    }else{
      x=edgeL;
    }

    // Opacity: full except gently fade at the off-screen moment
    const transitionDip=p>0.44&&p<0.56?1-fade(p,0.44,0.48)+fade(p,0.52,0.56):1;
    mirror.style.opacity=showAmount*transitionDip;

    // Vertical: gentle float
    const yBase=48+Math.sin(p*Math.PI*2.5)*12;
    const floatY=Math.sin(p*Math.PI*5)*5;
    // 3D rotation: faces inward, rotates during transition
    const isRightPhase=p<0.50;
    const baseRotY=isRightPhase?-15:15;
    // Extra spin during the slide transition
    const transitionSpin=p>0.40&&p<0.60?Math.sin(fade(p,0.40,0.60)*Math.PI)*20:0;
    const rotY=baseRotY+transitionSpin;
    const rotX=Math.sin(p*Math.PI)*-4;
    const rotZ=Math.sin(p*Math.PI*2)*2;
    const scale=1+Math.sin(p*Math.PI)*0.04;

    mirror.style.left=x+'%';
    mirror.style.top=yBase+'%';
    mirror.style.transform=`translate(-50%,calc(-50% + ${floatY}px)) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${scale})`;

    // ── Layers fade in continuously ──
    glass.style.opacity  =1-fade(p,0.85,0.95);
    frame.style.opacity  =fade(p,0.15,0.3)*(1-fade(p,0.85,0.95));
    frame.style.transform=`scale(${lerp(0.96,1,fade(p,0.15,0.35))})`;
    ig.style.opacity     =fade(p,0.35,0.52)*(1-fade(p,0.85,0.95));
    led.style.opacity    =fade(p,0.58,0.75)*(1-fade(p,0.88,0.96));
    finalEl.style.opacity=fade(p,0.85,0.97);

    // LED glow intensity
    const li=fade(p,0.58,0.8);
    const gs=Math.round(30+li*35);
    led.style.boxShadow=`0 0 ${gs}px rgba(255,255,255,${.15+li*.25}),0 0 ${gs*2}px rgba(200,168,75,${.1+li*.2}),0 0 ${gs*3}px rgba(200,168,75,${.05+li*.1})`;

    // ── Step label ──
    const step=p<0.12?0:p<0.30?1:p<0.50?2:p<0.72?3:4;
    stepLabel.textContent=steps[step];
    stepLabel.classList.add('visible');
    stepLabel.dataset.num=(step+1)+'/5';
    // Position label on same side as mirror
    if(x>50){stepLabel.style.right='10px';stepLabel.style.left='auto';}
    else{stepLabel.style.left='10px';stepLabel.style.right='auto';}
    if(showAmount<=0)stepLabel.classList.remove('visible');

    // ── Mirror brighter on dark backgrounds ──
    // Detect if mirror center overlaps a dark section
    const mirrorCenterY=window.innerHeight/2;
    const elAtCenter=document.elementFromPoint(window.innerWidth/2,mirrorCenterY);
    let isDark=false;
    if(elAtCenter){
      let el=elAtCenter;
      for(let i=0;i<5&&el;i++){
        const bg=getComputedStyle(el).backgroundColor;
        const m=bg.match(/\d+/g);
        if(m&&m.length>=3){
          const lum=(parseInt(m[0])*299+parseInt(m[1])*587+parseInt(m[2])*114)/1000;
          if(lum<80){isDark=true;break;}
        }
        el=el.parentElement;
      }
    }
    mirror.classList.toggle('on-dark',isDark);
    stepLabel.classList.toggle('on-dark',isDark);
  }

  function tick(){
    const diff=Math.abs(target-cur);
    if(diff>0.0002){
      cur+=(target-cur)*0.06;
      render();
      requestAnimationFrame(tick);
    }else{
      cur=target;
      render();
      running=false;
    }
  }

  function onScroll(){
    const scrollY=window.scrollY;
    const maxScroll=document.documentElement.scrollHeight-window.innerHeight;
    target=maxScroll>0?clamp(scrollY/maxScroll,0,1):0;
    if(!running){running=true;requestAnimationFrame(tick);}
  }

  window.addEventListener('scroll',onScroll,{passive:true});
  setTimeout(onScroll,300);
})();

// ========== COOKIE CONSENT ==========
(function(){
  var key='mirror_cookies_accepted';
  var banner=document.getElementById('cookie-banner');
  var btn=document.getElementById('cookie-accept');
  if(localStorage.getItem(key)){
    banner.classList.add('hidden');
  }
  btn.addEventListener('click',function(){
    localStorage.setItem(key,'1');
    banner.classList.add('hidden');
  });
})();

// ========== META PIXEL EVENTS ==========
document.addEventListener('click',function(e){
  var a=e.target.closest('a[href*="wa.me"],a[href*="whatsapp"],a[href^="tel:"],.whatsapp-float');
  if(a && typeof fbq==='function'){
    if(a.href && a.href.includes('tel:')) {
      fbq('track','Contact',{content_name:'Phone Call'});
    } else {
      fbq('track','Contact',{content_name:'WhatsApp'});
    }
  }
});
