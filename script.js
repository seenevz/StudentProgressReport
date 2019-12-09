var batchDomainURL = 'https://learn.co/api/v1/batches'

function getBatchFromInput() {
  const url = document.baseURI
  const inputText =
    "input the batch ID\n\n(If you're on a Learn's cohort page, it will have default value of the batch)"

  if (url.includes('learn.co')) {
    const batchId = url.includes('learn.co/batches')
      ? getInput(inputText, url.split('/')[4])
      : getInput(inputText)
    return parseInt(batchId)
  } else {
    alert("You're not on a Learn.co page")
    throw {
      message: 'exit'
    }
  }
}

function getInput(text = '', inputDefault = '') {
  try {
    const id = prompt(text, inputDefault)
    if (id === null) {
      throw 'exit'
    } else if (id.match(/[\D]/)) {
      throw 'Invalid input'
    }
    return id
  } catch (error) {
    if (error.includes('exit')) {
      throw {
        message: 'exit'
      }
    }
    const errorText = text.includes('You can only input numbers')
      ? text
      : 'You can only input numbers!\n\n' + text
    return getInput(errorText, inputDefault)
  }
}

async function getTracksFromBatch() {
  const batchId = getBatchFromInput()
  const batchURL = `${batchDomainURL}/${batchId}`

  const batchInfo = await fetch(batchURL).then(resp => resp.json())
  if (batchInfo.error) {
    throw batchInfo.status === '404'
      ? {
        message: "It looks like that batch doesn't exist!"
      }
      : {
        message: `<br/><br/>It looks like that batch is broken!<br/><br/><a href='https://learn.co/batches/${batchId}'>Check if the batch page is working</a>`
      }
  }
  const batchName =
    batchInfo.iteration[0].toUpperCase() + batchInfo.iteration.substr(1)

  return {
    batchName: batchName,
    batchInfo: batchInfo,
    id: batchId
  }
}

function textGenerator(batchTacks) {
  return batchTacks
    .map(track => `ID: ${track.track_id} => ${track.title}`)
    .join('\n\n')
}

function selectCurrentTrack({ batchInfo, batchName }) {
  const firstTrack = batchInfo.active_track_id
  const textDisplay = `These are the tracks available for ${batchName}\n\nEnter track ID from selection bellow:\n\n(Active track selected by default)\n\n ${textGenerator(
    batchInfo.tracks
  )}`
  const selectedTrack = getInput(textDisplay, firstTrack)

  return selectedTrack
}

async function init() {
  try {
    let batchInfo = await getTracksFromBatch()
    let batchId = batchInfo.id
    let trackId = selectCurrentTrack(batchInfo)

    let studentsURL = `${batchDomainURL}/${batchId}/tracks/${trackId}/progress`
    let lessonsURL = `${batchDomainURL}/${batchId}/tracks/${trackId}/deployed`

    let studentsPromise = fetch(studentsURL).then(res => res.json())
    let lessonsPromise = fetch(lessonsURL).then(res => res.json())
    let allPromisesArray = await Promise.all([studentsPromise, lessonsPromise])
    if (allPromisesArray[0].error || allPromisesArray[1].error) {
      throw {
        message: "This track doesn't seem to belong to this batch!"
      }
    }

    let studentData = allPromisesArray[0].map(student => {
      student.lessons = []
      return student
    })
    let lessonsData = allPromisesArray[1]
    getIndividualData(studentData, lessonsData, batchId, batchInfo.batchName)
  } catch (error) {
    if (error.message.includes('exit')) {
      return
    }
    const text = `Ooops! Something went wrong!\n\n${error.message}`
    displayErrorWindow(text)
    console.error(error.message)
  }
}

function getIndividualData(studentData, lessonsData, batchId, batchName) {
  let allLessonsPromises = []
  let counter = 1
  const win = createPopupWin()
  const p = showFetchPrgress(win)

  lessonsData.topics.forEach(topic => {
    topic.units.forEach(unit => {
      unit.lessons.forEach(lesson => {
        let promise = fetch(
          `${batchDomainURL}/${batchId}/lessons/${lesson.node.id}`
        ).then(res => {
          const fetchText = `Fetched ${counter} ${
            counter > 1 ? 'lessons' : 'lesson'
            }`
          updateFetchCounter(fetchText, p)
          counter++
          return res.json()
        })
        allLessonsPromises.push(promise)
      })
    })
  })
  let donePromise = Promise.all(allLessonsPromises)
  donePromise.then(lessonsStudentsData => {
    compileResults(studentData, lessonsStudentsData, win, batchName)
  })
}

function compileResults(studentData, lessonsStudentsData, win, batchName) {
  lessonsStudentsData.forEach(lesson => {
    lesson.students.forEach(student => {
      let studentsData = studentData.find(
        studentsData => studentsData.id === student.id
      )
      let progress
      if (student.completed_at) {
        progress = `✅ `
      } else if (student.started_at && !student.completed_at) {
        progress = `💪 `
      } else if (!student.started_at) {
        progress = `❌ `
      }
      progress += lesson.title
      studentsData.lessons.push(progress)
    })
  })

  renderStudentProgress(studentData, win, batchName)
}

function displayErrorWindow(errorText) {
  win = createPopupWin()
  p = showFetchPrgress(win)
  p.innerHTML = errorText

  win.document.body.innerHTML = ''
  win.document.body.append(p)
}

function showFetchPrgress(win) {
  const p = win.document.createElement('p')
  p.style.margin = '0 auto'
  win.document.body.append(p)

  return p
}

function updateFetchCounter(counterText, p) {
  p.innerText = counterText
}

function renderStudentLessons(lessons) {
  return lessons.map(lesson => {
    const li = document.createElement('li')
    li.innerText = lesson
    return li
  })
}

function renderStudent(student) {
  const div = document.createElement('div')
  const h3 = document.createElement('h3')
  const ul = document.createElement('ul')
  ul.style.listStyleType = 'none'
  ul.style.overflow = 'hidden'
  ul.style.transition = 'max-height 1.5s ease 0s'
  ul.style.height = 'auto'
  ul.style.maxHeight = '4500px'
  ul.style.maxHeight = '0px'
  h3.style.display = 'inline-block'
  h3.style.margin = '10px 0'
  h3.style.cursor = 'pointer'

  const lessonsLi = renderStudentLessons(student.lessons)

  h3.innerText = student.full_name
  ul.append(...lessonsLi)
  h3.addEventListener('click', function () {
    ul.style.maxHeight = ul.style.maxHeight === '0px' ? '5000px' : '0px'
  })
  div.append(h3, ul)
  return div
}

function createPopupWin() {
  const windowOpts = `left=${window.outerWidth / 4},top=${window.outerHeight /
    4},height=${(window.innerHeight / 6) * 4},width=${window.innerWidth /
    2},locations=no,zoom`

  try {
    const newWin = window.open('', '_tab', windowOpts)
    if (!newWin) {
      throw 'No pop-ups allowed'
    }

    newWin.document.body.style.maxWidth = '600px'
    newWin.document.body.style.margin = '0 auto'
    newWin.document.body.style.color = '#5c5c5c'
    newWin.document.body.style.backgroundColor = 'White'
    newWin.document.body.style.fontFamily =
      "'Aktiv Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif"

    return newWin
  } catch (error) {
    alert(
      'You need to allow pop-up windows for Learn.co\n\nYou should have an icon on the right side of your URL bar that allows pop-up windows.'
    )
  }
}

function renderStudentProgress(studentData, win, batchName) {
  const div = document.createElement('div')
  const ul = document.createElement('ul')
  const h1 = document.createElement('h1')

  h1.style.textAlign = 'center'
  h1.style.margin = '8% 0'
  h1.innerText = `Lab completion list for ${batchName}`
  const students = studentData.map(student => renderStudent(student))

  ul.append(...students)
  div.append(h1, ul)

  win.document.body.querySelectorAll('*').forEach(n => n.remove())
  win.document.body.append(div)
}

init()
void (0)