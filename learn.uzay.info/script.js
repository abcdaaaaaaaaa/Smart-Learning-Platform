function parseText(txt){
    const blocks=txt.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean)
    const cards=[]
    for(const block of blocks){
        const lines=block.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
        if(lines.length>=2){
            const word=lines[0]
            const definition=lines.slice(1).join(' ')
            cards.push({word,definition})
        }
    }
    return cards
}

function shuffle(a){
    for(let i=a.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1))
        ;[a[i],a[j]]=[a[j],a[i]]
    }
    return a
}

let allCards=[],currentBatch=[],mcQueue=[],classicQueue=[],batchSize=12,globalQueue=[],state='idle',waitingClassic=false,totalCorrect=0,lastAskedClassicCard=null

const fileInput=document.getElementById('file')
const startBtn=document.getElementById('start')
const resetBtn=document.getElementById('reset')
const progress=document.getElementById('progress')
const quiz=document.getElementById('quiz')
const definitionEl=document.getElementById('definition')
const optionsEl=document.getElementById('options')
const typed=document.getElementById('typed')
const checkTyped=document.getElementById('checkTyped')
const writeArea=document.getElementById('writeArea')
const resultEl=document.getElementById('result')
const counter=document.getElementById('counter')
const continueBtn=document.getElementById('continueBtn')
const hintBtn=document.getElementById('hintBtn')
const correctBtn=document.getElementById('correctBtn')
const dontKnowBtn=document.getElementById('dontKnowBtn')
const progressBar=document.getElementById('progressBar')

const correctSound=document.getElementById('correctSound')
const finishBatchSound=document.getElementById('finishBatchSound')
const finishAllSound=document.getElementById('finishAllSound')

fileInput.addEventListener('change',e=>{
    const f=e.target.files[0]
    if(!f)return
    const reader=new FileReader()
    reader.onload=ev=>{
        allCards=parseText(ev.target.result)
        if(allCards.length){
            progress.textContent=allCards.length+' kart yüklendi. Periyot seçip "Çalışmayı Başlat" basın.'
            shuffle(allCards)
        }else progress.textContent='Dosya boş veya hatalı.'
    }
    reader.readAsText(f,'utf-8')
})

startBtn.addEventListener('click',()=>{
    if(!allCards.length){progress.textContent='Önce language.txt yükleyin.';return}
    batchSize=parseInt(document.getElementById('periyot').value,10)
    globalQueue=allCards.slice()
    state='mc'
    quiz.style.display='block'
    totalCorrect=0
    lastAskedClassicCard=null
    prepareNextBatch()
    updateProgressBar()
})

resetBtn.addEventListener('click',()=>{
    allCards=[]
    currentBatch=[]
    mcQueue=[]
    classicQueue=[]
    globalQueue=[]
    state='idle'
    waitingClassic=false
    totalCorrect=0
    lastAskedClassicCard=null
    progress.textContent='Sıfırlandı. language.txt yükleyin.'
    quiz.style.display='none'
    updateProgressBar()
    fileInput.value=''
})

function prepareNextBatch(){
    if(globalQueue.length===0){
        finishAllSound.currentTime=0
        finishAllSound.play()
        progress.textContent='Tüm kelimeler tamamlandı.'
        definitionEl.textContent='Tebrikler!'
        optionsEl.innerHTML=''
        writeArea.style.display='none'
        return
    }
    currentBatch=globalQueue.splice(0,batchSize)
    mcQueue=currentBatch.slice()
    shuffle(mcQueue)
    classicQueue=currentBatch.slice()
    state='mc'
    waitingClassic=false
    lastAskedClassicCard=null
    renderMC()
}

function renderMC(){
    if(mcQueue.length===0){
        state='classic'
        renderClassic()
        return
    }
    const card=mcQueue[0]
    definitionEl.textContent=card.definition
    optionsEl.innerHTML=''
    const others=shuffle(allCards.map(c=>c.word).filter(w=>w!==card.word)).slice(0,3)
    const choices=shuffle([card.word,...others])
    for(const ch of choices){
        const b=document.createElement('button')
        b.className='opt-btn'
        b.textContent=ch
        b.onclick=()=>handleMCAnswer(b,ch,card)
        optionsEl.appendChild(b)
    }
    writeArea.style.display='none'
    typed.value=''
    resultEl.textContent=''
    hintBtn.style.display='none'
    dontKnowBtn.style.display='none'
    correctBtn.style.display='none'
    continueBtn.style.display='none'
    counter.textContent='MC: '+(currentBatch.indexOf(card)+1)+'/'+currentBatch.length
}

function handleMCAnswer(btn,ans,card){
    for(const b of optionsEl.children)b.disabled=true
    if(ans===card.word){
        btn.classList.add('correct')
        resultEl.textContent='Doğru!'
        correctSound.currentTime=0
        correctSound.play()
        totalCorrect++
        updateProgressBar()
        mcQueue.shift()
        setTimeout(()=>renderMC(),600)
    }else{
        btn.classList.add('wrong')
        resultEl.textContent='Yanlış. Doğru: '+card.word
        mcQueue.shift()
        mcQueue.push(card)
        continueBtn.style.display='inline-block'
        waitingClassic=true
    }
}

continueBtn.addEventListener('click',()=>{
    if(waitingClassic){
        waitingClassic=false
        continueBtn.style.display='none'
        renderMC()
    }
})

function renderClassic(){
    if(classicQueue.length===0){
        if(globalQueue.length>0){
            prepareNextBatch()
            return
        }
        progress.textContent='Tüm periyotlar tamamlandı.'
        definitionEl.textContent='Bitti'
        optionsEl.innerHTML=''
        writeArea.style.display='none'
        hintBtn.style.display='none'
        dontKnowBtn.style.display='none'
        correctBtn.style.display='none'
        continueBtn.style.display='none'
        finishAllSound.currentTime=0
        finishAllSound.play()
        return
    }
    const card=classicQueue[0]
    definitionEl.textContent=card.definition
    optionsEl.innerHTML=''
    writeArea.style.display='flex'
    typed.value=''
    resultEl.textContent='Klasik: yazılı cevap verin.'
    counter.textContent='Klasik: '+(currentBatch.indexOf(card)+1)+'/'+currentBatch.length
    hintBtn.style.display='inline-block'
    dontKnowBtn.style.display='inline-block'
    correctBtn.style.display='none'
    continueBtn.style.display='none'
}

checkTyped.addEventListener('click',()=>{
    if(state!=='classic'||waitingClassic)return
    const ans=typed.value.trim()
    if(!ans){resultEl.textContent='Bir şey yazın.';return}
    const card=classicQueue.shift()
    const isLastClassicInBatch = classicQueue.length===0
    const isLastBatch = globalQueue.length===0
    if(ans.toLowerCase()===card.word.toLowerCase()){
        resultEl.textContent='Doğru!'
        totalCorrect++
        updateProgressBar()
        lastAskedClassicCard=null
        waitingClassic=false
        if(!isLastClassicInBatch){
            correctSound.currentTime=0
            correctSound.play()
        }
        if(isLastClassicInBatch && !isLastBatch){
            finishBatchSound.currentTime=0
            finishBatchSound.play()
        }
        if(isLastClassicInBatch && isLastBatch){
            finishAllSound.currentTime=0
            finishAllSound.play()
        }
        setTimeout(()=>renderClassic(),500)
    }else{
        resultEl.textContent='Yanlış. Doğru: '+card.word
        classicQueue.push(card)
        lastAskedClassicCard=card
        waitingClassic=true
        continueBtn.style.display='inline-block'
        correctBtn.style.display='inline-block'
        hintBtn.style.display='none'
        dontKnowBtn.style.display='none'
        writeArea.style.display='none'
    }
})

hintBtn.addEventListener('click',()=>{
    if(classicQueue.length>0){
        const card=classicQueue[0]
        typed.value=card.word.slice(0,2)
    }
})

dontKnowBtn.addEventListener('click',()=>{
    if(classicQueue.length>0){
        const card=classicQueue.shift()
        typed.value=card.word
        resultEl.textContent='Doğru: '+card.word
        classicQueue.push(card)
        lastAskedClassicCard=card
        writeArea.style.display='none'
        hintBtn.style.display='none'
        correctBtn.style.display='none'
        dontKnowBtn.style.display='none'
        continueBtn.style.display='inline-block'
        waitingClassic=true
    }
})

correctBtn.addEventListener('click',()=>{
    if(classicQueue.length>0 && lastAskedClassicCard){
        const idx = classicQueue.indexOf(lastAskedClassicCard)
        if(idx > -1) classicQueue.splice(idx,1)
        totalCorrect++
        updateProgressBar()
        const isLastClassicInBatch = classicQueue.length === 0
        const isLastBatch = globalQueue.length === 0
        if(isLastClassicInBatch){
            if(!isLastBatch){
                finishBatchSound.currentTime = 0
                finishBatchSound.play()
            }
        } else {
            correctSound.currentTime = 0
            correctSound.play()
        }
        lastAskedClassicCard = null
        waitingClassic = false
        continueBtn.style.display = 'none'
        correctBtn.style.display = 'none'
        writeArea.style.display = 'flex'
        renderClassic()
    } else if(classicQueue.length > 0){
        classicQueue.shift()
        waitingClassic = false
        continueBtn.style.display = 'none'
        correctBtn.style.display = 'none'
        renderClassic()
    }
})

function updateProgressBar(){
    const total=allCards.length*2
    progressBar.style.width=(totalCorrect/total*100)+'%'
}

typed.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();checkTyped.click()}
})