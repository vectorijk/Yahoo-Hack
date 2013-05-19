function genGeoFinderUrl(longitude, latitude) {
  var query = 'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20geo.placefinder%20where%20text%3D%22';
  query += latitude;
  query += '%2C' + longitude;
  query += '%22%20and%20gflags%3D%22R%22%20&format=json&diagnostics=true';
  return query;
}

function genWeatherForecastUrl(woeid) {
  var query = 'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%3D';
  query += woeid;
  query += '&format=json&diagnostics=true';
  return query;
}

function genGeoPlaceUrl(text) {
  var query = 'http://query.yahooapis.com/v1/public/yql?q=select%20centroid%20from%20geo.places%20where%20text%3D%22';
  query += encodeURI(text) + '%22&format=json';
  return query;
}

function httpGet(theUrl) {
  var xmlHttp = null;
  xmlHttp = new XMLHttpRequest();
  xmlHttp.open('POST', theUrl, false);
  xmlHttp.send(null);
  return xmlHttp.responseText;
}

function getSquareDistance(ax, ay, bx, by) {
  return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
}

function getWoeid(geoinfo) {
  var rsCount = geoinfo.query.count;
  var rs = geoinfo.query.results.Result;
  if (rsCount == 0) {
    return null;
  }
  else if (rsCount == 1) {
    return rs.woeid;
  }
  else {
    var minDistance = getSquareDistance(r[0].longitude, r[0].latitude, longitude, latitude);
    var tmp = 0;
    var key = 0;
    for (var i = 1; i < count; ++i) {
      tmp = getSquareDistance(r[i].longitude, r[i].latitude, longitude, latitude);
      if (tmp < minDistance) {
        minDistance = tmp;
        key = i;
      }
    }
    return rs[key].woeid;
  }
}

function fToC(f) {
  return (f - 32) * 5 / 9;
}

function mileToKm(mile) {
  return 1.609334 * mile;
}

var months = {
  'Jan': '1',
  'Feb': '2',
  'Mar': '3',
  'Apr': '4',
  'May': '5',
  'Jun': '6',
  'Jul': '7',
  'Aug': '8',
  'Sept': '9',
  'Oct': '10',
  'Nov': '11',
  'Dec': '12'
}

function dateToLocal(s) {
  var arr = s.split(' ');
  // alert(arr[2]);
  // alert(monts[arr[1]]);
  var ret = arr[2] + '年' + months[arr[1]] + '月' + arr[0] + '日';
  // alert(ret);
  return ret;
}

function getWeather(longitude, latitude) {
  var geoFinderUrl = genGeoFinderUrl(longitude, latitude);
  var geoinfo = JSON.parse(httpGet(geoFinderUrl));
  var woeid = getWoeid(geoinfo);
  if (woeid == null) {
    return null;
  }

  var weatherForecastUrl = genWeatherForecastUrl(woeid);
  var weather = JSON.parse(httpGet(weatherForecastUrl));
  var rs = weather.query.results.channel;
  var ret = new Object();
  ret.location = rs.location;
  ret.units = rs.units;
  ret.units.distance = 'km';
  ret.units.speed = ' km/h';
  ret.units.temperature = '°C';
  ret.today = new Object();
  ret.today.wind = rs.wind;
  ret.today.wind.speed = mileToKm(ret.today.wind.speed).toFixed(1);
  ret.today.atmosphere = rs.atmosphere;
  ret.today.astronomy = rs.astronomy;
  ret.today.image = rs.item.description.match(/http.*?gif/);
  ret.item = rs.item;
  ret.item.condition.temp = fToC(ret.item.condition.temp).toFixed(1);

  for (var i = 0; i < ret.item.forecast.length; ++i) {
    ret.item.forecast[i].high = fToC(ret.item.forecast[i].high).toFixed(1);
    ret.item.forecast[i].low = fToC(ret.item.forecast[i].low).toFixed(1);
  }

  return ret;
}

function getGeoPoint(text) {
  var centroid = null;
  var geoPlaceUrl = genGeoPlaceUrl(text);
  var rs = JSON.parse(httpGet(geoPlaceUrl));
  var count = rs.query.count;
  if (count == 0) {
    centroid = null;
  }
  if (count == 1) {
    centroid = rs.query.results.place.centroid;
  }
  else {
    centroid = rs.query.results.place[0].centroid;
  }
  return centroid;
}

var imgUrl = 'http://l.yimg.com/a/i/us/we/52/'

function putSth(which, where, tempUnit) {
  $('#time-' + which).html(dateToLocal(where.date));
  $('#high-temp-' + which).html(where.high + tempUnit);
  $('#low-temp-' + which).html(where.low + tempUnit);
  $('#img-' + which).attr('src', imgUrl + where.code + '.gif');
  $('#text-' + which).html(where.text);
}

function toRepr(longitude, latitude) {
  var ret = '';
  if (longitude > 0) {
    ret = '东经' + longitude + '度，'
  }
  else {
    longitude = -longitude;
    ret = '西经' + longitude + '度，';
  }
  if (latitude > 0) {
    ret += '北纬' + latitude + '度';
  }
  else {
    latitude = -latitude;
    ret += '南纬' + latitude + '度';
  }
  return ret;
}

function show(weather) {
  $('#loc').html(weather.location.country + ', ' + weather.location.city);
  $('#geo').html(toRepr(weather.item.long, weather.item.lat));

  $('#temp-today').html(weather.item.condition.temp + ' ' + weather.units.temperature);
  $('#humi-today').html(weather.today.atmosphere.humidity + '%');
  $('#wind-today').html(weather.today.wind.speed + weather.units.speed);
  $('#img-today').attr('src', imgUrl + weather.item.condition.code + '.gif');
  $('#text-today').html(weather.item.condition.text);

  putSth('first', weather.item.forecast[0], weather.units.temperature);
  putSth('second', weather.item.forecast[1], weather.units.temperature);

}

function showWeather() {
  var w = getWeather(globals.longitude, globals.latitude);
  if (w) {
    show(w);
  }
}

function updatePoint() {
  var text = document.getElementById('togo').value;
  if (text != "") {
    var centroid = getGeoPoint(text);
    if (centroid != null) {
      globals.longitude = centroid.longitude;
      globals.latitude = centroid.latitude;
    }
  }
}