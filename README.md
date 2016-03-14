# node-trello-convert

## Introduction
This utility will convert an exported Trello json file into a csv file that can be imported into CA Agile Central.

## Setup

1. Requires a node.js runtime. You can install node from [here](https://nodejs.org/en/)

2. After cloning this repository run the following to install dependencies
```javascript
npm install
```

## Configuration

1. Edit the config.json file

	Specify the workspace name & api-key values


## Running

1. Export your trello board as a json file.

[Exporting data from Trello](http://help.trello.com/article/747-exporting-data-from-trello-1)

2. Run the utility using the following syntax 

```javascript
node index.js <input.json> <output.csv>
```
eg.
```javascript
node index.js my-file.json my-file.csv
```

## Output

The following columns are exported to the csv file 

| Column Name | Description | Agile Central Mapping |
| ----------- | ----------- | --------------------- |
| list | The trello column name | This column is not mapped to Agile Central |
| name | Card Title | Story name |
| description | Card description | Story description |
| schedulestate | Empty, and must be manually completed | Schedule State |
| owner | Email address of card owner | Story owner, must be a valid Agile Central user |
| tags  | A comma delimited list of labels. Note tags are not automatically imported | None | 
| color | Currently empty | None |
| notes | Currently combines a link to the orginal Trello card, a list of label names and a list of links to card attachments | Notes |
