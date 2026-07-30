export function toKotlinProperty(name) {
  const [first = '', ...rest] = splitName(name);
  return first + rest.map(capitalize).join('');
}

export function toKotlinType(name) {
  return splitName(name).map(capitalize).join('');
}

function splitName(name) {
  return name.split(/[.-]/).filter(Boolean);
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}
