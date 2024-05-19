---
title: 28. Multidimensional Arrays
---

## commit log

```plaintext
Add arrays of arrays
```

实现数组的数组。当然，也支持数组的数组的数组。

## 思路

我们首先想一个问题，`int x[2][3]`，它代表的到底是什么意思？它是指3个数组，数组里面再包含带2个元素的数组，还是反过来，指2个数组，里面再包含带3个元素的数组？

换句话说，到底`x[0][1]`和`x[1][1]`在内存上是紧挨着的吗？还是说`x[1][0]`和`x[1][1]`在内存上是紧挨着的？

实际上，前者是正确的，`int x[2][3]`的意思是指3个数组，数组里面再包含带2个元素的数组。

弄清楚这个问题之后，我们就可以明白，`int x[2][3]`某种意义上可以看作是`int[2] x[3]`这种形式，它是一个array，它的array_len是3，每个元素的类型是`array`，每个元素的具体类型是`int[2]`。

那么，我们来看一个关键的函数，`type_suffix`，我们现在是这么写的：

```c
static Type *type_suffix(Token **rest, Token *tok, Type *ty) {
  if (equal(tok, "("))
    return func_params(rest, tok->next, ty);

  if (equal(tok, "[")) {
    int sz = get_number(tok->next);
    *rest = skip(tok->next->next, "]");
    return array_of(ty, sz);
  }

  *rest = tok;
  return ty; 
}
```

我们先前所有调用`type_suffix`的地方，参数`ty`都是`int`，其实当我们要解析`int x[2][3]`这样的形式的时候，只需要再一次调用这个函数，让这个`ty`是一个`array`就好了。

所以我们这么改：

```c
static Type *type_suffix(Token **rest, Token *tok, Type *ty) {
  if (equal(tok, "("))
    return func_params(rest, tok->next, ty);

  if (equal(tok, "[")) {
    int sz = get_number(tok->next);
    tok = skip(tok->next->next, "]");
    ty = type_suffix(rest, tok, ty);
    return array_of(ty, sz);
  }

  *rest = tok;
  return ty; 
}
```

对于`int x[2]`，在返回一个`array`之后，第二次调用`type_suffix`就仅仅是`return ty`。但是对于`int x[2][3]`，在返回一个`array`后，会再次调用`type_suffix`，生成一个新的`array`。而我们的`array_of`本身就可以保证分配正确的内存。

## test.sh

添加以下测例：

```bash
assert 0 'int main() { int x[2][3]; int *y=x; *y=0; return **x; }'
assert 1 'int main() { int x[2][3]; int *y=x; *(y+1)=1; return *(*x+1); }'
assert 2 'int main() { int x[2][3]; int *y=x; *(y+2)=2; return *(*x+2); }'
assert 3 'int main() { int x[2][3]; int *y=x; *(y+3)=3; return **(x+1); }'
assert 4 'int main() { int x[2][3]; int *y=x; *(y+4)=4; return *(*(x+1)+1); }'
assert 5 'int main() { int x[2][3]; int *y=x; *(y+5)=5; return *(*(x+1)+2); }'
```

‍
