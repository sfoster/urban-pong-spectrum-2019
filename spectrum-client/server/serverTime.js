module.exports = {
  _date: new Date(),

  get date() {
    return this._date;
  },
  get timestamp() {
    return this._date.getTime();
  },
  get utcString() {
    let d = this._date;
    return d.getUTCHours() + ':' + d.getUTCMinutes() + ':' + d.getUTCSeconds() +
           '.' + d.getUTCMilliseconds() + ' GMT';
  },
  touch() {
    this._date = new Date();
  }
};
