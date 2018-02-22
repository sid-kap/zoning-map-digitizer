# zoning map digitizer

## Introduction

Most cities publish their zoning maps, but most only publish them in PDF formats, rather than in GIS-friendly digital formats. This project is a webapp that allows you to upload a PDF and choose polygons from the map image that correspond to zoning. In the end, you can type in the zone name for each rectangle and download all the polygons in the form of a GeoJSON feature layer.

Ultimately, the goal is to make this part of a larger project of collecting zoning maps from across the US into a standardized format. Hopefully, that format would, in addition to the geographical zoning data, also include metadata about each zone (like allowed uses, FAR and height limits, etc.). The collected zoning maps could later be made into an interactive map that allows you to explore the zoning of all the included cities from a single place.

## Technical overview

This is designed to work with zoning maps like the following:
* [Torrance, CA](https://www.torranceca.gov/home/showdocument?id=2784)
* [Downey, CA](http://www.downeyca.org/civicax/filebank/blobdload.aspx?BlobID=5149)
* [Maywood, CA](https://evogov.s3.amazonaws.com/media/100/media/35931.pdf)
* [Commerce, CA](http://www.ci.commerce.ca.us/DocumentCenter/Home/View/349)
* [Pico Rivera, CA](http://www.pico-rivera.org/civicax/filebank/blobdload.aspx?blobid=2692)
* [South Pasadena, CA](http://www.ci.south-pasadena.ca.us/modules/showdocument.aspx?documentid=192)
* [Glendale, CA](http://www.glendaleca.gov/home/showdocument?id=654)
* [Burbank, CA](http://www.burbankca.gov/home/showdocument?id=2620)
* [Berkeley, CA](https://www.cityofberkeley.info/uploadedFiles/IT/Level_3_-_General/Zoning%20Map%2036x36%2020050120.pdf)

Most modern computer-generated zoning maps tend to have a few common features:
* Each zone is usually drawn in a different color
* The main part of the map is usually drawn in very saturated colors, with the background usually in a faded gray color
* Cities tend to be shaped as one connected component
* The same colors are sometimes used elsewhere in the map (for example, in a map legend), but that is usually on the borders of the map (outside the main connected component that represents the city map)

This project takes advantage of these characteristics to make extracting the zones from the map easier and faster.

(Will probably add more details here later.)

## Software stack

Because I needed an interactive graphical user interface, I decided to make this a webapp. But at the same time, it also needs access to image-processing utilities. Since the most popular image processing utilities are server-side libraries (such as scipy, OpenCV, and Pillow), the obvious choice would be to do the image processing on a Python server and the user interface in a web front-end. However, to avoid the overhead of writing a client-server application, I chose to write the whole thing on the client-side. This was only possible because of new web technologies that allow writing high-performance image-processing code on the client side—namely, WebAssembly and OpenCV.js.

Ultimately it will be served from a web server, but a static server will suffice because all computation will be on the front-end.

## Steps:
- [x] load PDF file
- [x] isolate a large, highly-saturated section in the middle of the map (zoning map always uses very saturated colors)
- [x] quantize the colors of the map using K-Means clustering
- [x] lump areas of similar color into polygon-shaped patches
- [x] let the user select which patches are correct, assign a name/label to each one
- [x] let the user enter in correspondences between points (row, col -> lat, long), use linear regression to find the transformation
- [ ] make a GeoJSON of the colored polygons with the user's labels

## TODO:
- [x] make the algorithm parameters configurable (I made some `<input>` fields, but they don't do anything)
- [ ] make the blob boundary functions take account of holes inside the polygon
- [ ] allow uploading PNG (or even other image formats) in addition to PDF
- [ ] show loading animation on segmentation step
- [ ] show progress bar or something on findPolygons step (preferably, show detailed process like "in KMeans", "Processing color x/25", etc. because it's so slow)
- [ ] if coordinates loaded from saved state, make the text box properly indicate it's using the backed-up coordinates (in fact, we can probably get rid of the input box at some point since we have app state storage now)
- [ ] unshow polygon if deleted (I think it's staying around because the onmouseexit is never called when the user clicks on the X, so should do it there... or you know use React)

Stuff to speed up the testing/development of program:
- [x] Persistent storage of app state, so that you can reload it and not have to re-do steps (using IndexedDB)
- [ ] Download state of app into a file (and be able to restore from state), so that you can go mess with it later

UI stuff:
- [x] Sort polygons in decreasing area order (and show the area, in acres or sq mi, in the list)
- [x] make way to enter in name of zone
- [ ] make fast way of entering same zone for things of same color
