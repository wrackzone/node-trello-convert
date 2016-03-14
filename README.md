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
