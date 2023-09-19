import { parse } from 'node-html-parser'
import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs'

const dstPath = 'docs/generated-schema.sql'
const src = readFileSync('data/book.html', 'utf8')
const domRoot = parse(src)
const sqlHeader = `SET client_encoding = 'UTF8';
DROP TABLE IF EXISTS chapter CASCADE;
DROP TABLE IF EXISTS section CASCADE;
DROP TABLE IF EXISTS element_type CASCADE;
DROP TABLE IF EXISTS element;

CREATE TABLE chapter (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE section (
  id SERIAL PRIMARY KEY,
  chapter_id INT NOT NULL, 
  title TEXT NOT NULL,
  number INT NOT NULL,
  FOREIGN KEY (chapter_id) REFERENCES chapter(id)
);

CREATE TABLE element_type (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE element (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL,
  element_type_id INT NOT NULL,
  index INT NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY (section_id) REFERENCES section(id),
  FOREIGN KEY (element_type_id) REFERENCES element_type(id)
);

INSERT INTO element_type (description)
  VALUES ('paragraph'),
         ('letter'),
         ('footnote'),
         ('no_indent'),
         ('diagram'),
         ('code'), 
         ('non_section_header'),
         ('image');

INSERT INTO chapter (title) VALUES
`
const sqlInsertSection = 'INSERT INTO section (chapter_id, title, number) VALUES'
const sqlInsertElement = 'INSERT INTO element (section_id, element_type_id, index, content) VALUES'

// Breaking down the DOM of book.html
const bookParts = domRoot.querySelectorAll('.chapter')
const chapters = {}

// Only want content from the Guide portion of the book
const startFlag = 'I. Guide'
const stopFlag = 'II. Reference'
let collectDivs = false

bookParts.forEach(
  (div) => {
    let title = ''
    const headers = div.querySelectorAll('h2, h3')
    if (headers.length > 0) {
      title = headers[0].innerText
    }

    // collectDivs set to true at bottom of function, so we don't collect the "I. Guide" header node
    if (title === stopFlag) {
      collectDivs = false
    } else if (collectDivs) { // HERE Start collecting HTML and additional required data
      // Fix img paths
      div.querySelectorAll('img').forEach(
        (image) => {
          const oldSrc = image.getAttribute('src')
          const oldSrcTokens = oldSrc.split('/')
          const newSrc = `/images/book/${oldSrcTokens[oldSrcTokens.length - 1]}`
          image.setAttribute('src', newSrc)
        }
      )

      // Clean up collected HTML
      div.innerHTML = div.innerHTML.replaceAll('\r\n', '\n')
      div.innerHTML = div.innerHTML.trim()

      // Each h2/h3 tag has an anchor tab named something like chap01 or chap01.4 ...
      // We split into two parts, chapter and section
      const chapterAndSection = headers[0].querySelector('a').id.split('.')

      // remove the chap from the number
      chapterAndSection[0] = Number(chapterAndSection[0].substring(4))

      if (chapterAndSection.length === 1) {
        chapterAndSection.push(0) // If no section listed, we are working with chapter intro (section 0 for our purposes)
      } else {
        chapterAndSection[1] = Number(chapterAndSection[1])
      }

      // Add chapter to object if not exists
      if (!(chapterAndSection[0] in chapters)) {
        chapters[chapterAndSection[0]] = {}
        chapters[chapterAndSection[0]].title = title
        chapters[chapterAndSection[0]].sections = {}
      }

      // Add section to object (reminder, treating intro to chapter as section 0)
      chapters[chapterAndSection[0]].sections[chapterAndSection[1]] = {}
      chapters[chapterAndSection[0]].sections[chapterAndSection[1]].title = title
      chapters[chapterAndSection[0]].sections[chapterAndSection[1]].parts = {}

      let index = -1
      div.childNodes.forEach(
        (part) => {
        // Will need to determine element_type at a later date
          if (index !== -1) { // Skip the first as title has been extracted already
            chapters[chapterAndSection[0]].sections[chapterAndSection[1]].parts[index] = {}

            // TODO detect type and store appropriate data into content
            chapters[chapterAndSection[0]].sections[chapterAndSection[1]].parts[index].content = part.innerText
            // Calling everything a paragraph for prototyping's sake
            chapters[chapterAndSection[0]].sections[chapterAndSection[1]].parts[index].type_id = 1
          }
          index++
        }
      )
    }

    // Start collecting at the beginning of the guide section
    if (title === startFlag) {
      collectDivs = true
    }
  }
)

// Now, we need to insert our JavaScript object into a completed SQL statement
// The insert statement for chapters was already started in sqlHeader
const chapNums = Object.keys(chapters)
const fd = openSync(dstPath, 'w')
writeFileSync(fd, sqlHeader)

// Insert chapters
writeFileSync(fd, `('${chapters[chapNums[0]].title}')`)
chapNums.slice(1).forEach(
  (key) => {
    writeFileSync(fd, `,\n('${chapters[key].title}')`)
  }
)
writeFileSync(fd, ';\n\n')

// Insert sections -- (chapter_id, title, number)
let first = true
writeFileSync(fd, sqlInsertSection)
chapNums.forEach(
  (chapKey) => {
    const chapter = chapters[chapKey]
    const sectNums = Object.keys(chapter.sections)
    if (first) {
      writeFileSync(fd, `('${chapKey}', '${chapter.sections[0].title}', '${sectNums[0]}')`)
      sectNums.slice(1).forEach(
        (sectKey) => {
          writeFileSync(fd, `,\n('${chapKey}', '${chapter.sections[sectKey].title}', '${sectKey}')`)
        }
      )

      first = false
    } else {
      sectNums.forEach(
        (sectKey) => {
          writeFileSync(fd, `,\n('${chapKey}', '${chapter.sections[sectKey].title}', '${sectKey}')`)
        }
      )
    }
  }
)
writeFileSync(fd, ';\n\n')

// Insert elements (AKA "parts") -- (section_id, element_type_id, index, content)
// Note: I regret naming a database table the same name as a restricted word in JavaScript!
let sectId = 1
first = true // Piggy-backing sentinel variable from previous loop
writeFileSync(fd, sqlInsertElement)
chapNums.forEach(
  (chapKey) => {
    const chapter = chapters[chapKey]
    const sectNums = Object.keys(chapter.sections)
    sectNums.forEach(
      (sectKey) => {
        const section = chapter.sections[sectKey]
        const partIndicies = Object.keys(section.parts)
        if (first) {
          writeFileSync(fd, `('${sectId}', '${section.parts[0].type_id}', '${partIndicies[0]}', '${section.parts[0].content}')`)
          partIndicies.slice(1).forEach(
            (i) => {
              writeFileSync(fd, `,\n('${sectId}', '${section.parts[i].type_id}', '${i}', '${section.parts[i].content}')`)
            }
          )

          first = false
        } else {
          partIndicies.forEach(
            (i) => {
              writeFileSync(fd, `,\n('${sectId}', '${section.parts[i].type_id}', '${i}', '${section.parts[i].content}')`)
            }
          )
        }

        sectId++
      }
    )
  }
)
writeFileSync(fd, ';\n\n')

closeSync(fd)
