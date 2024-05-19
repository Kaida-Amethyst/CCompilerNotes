---
title: 29. Array Index Operator
---

## commit log

```plaintext
Add [] operator
```

我们先前的测例，在给数组赋值的时候，都是用指针。但是我们知道，在C语言当中，我们通常是用`[]`来进行索引的。这一次commit，我们来添加这个功能。

## 思路

对于`x[2]`，这种表达式，它其实是一个解引用，其实可以转换为`*(x+2)`，所以我们在对这里做语法分析的时候，是要生成一个`DEREF`的节点的，而这个解引用，是一种unary的操作，它的左子树，是一个加法。

所以就很明确了，我们要修改语法分析中的unary，但是这种unary操作与其它的unary操作不太一样，它的操作符是放在后面的。

```c
static Node *unary(Token **rest, Token *tok) {
  /*  if tok == +, -, *, & */
  return postfix(rest, tok)
}
```

如果前面有符号，那么就按照前面的来，如果没有，那么还要在做一次postfix，就是看看后面有没有符号。（这里原先是返回一个primary的）

```c
static Node *postfix(Token **rest, Token *tok) {
  Node *node = primary(&tok, tok);
  while(equal(tok, "[")) {
    Token *start = tok;
    Node *idx = expr(&tok, tok->next);
    tok = skip(tok, "]");
    node = new_unary(ND_DEREF, new_add(node, idx, start), start);
  }
  *rest = tok;
  return node;
}
```

ok，这样就完成了。

## test.sh

```bash
assert 3 'int main() { int x[3]; *x=3; x[1]=4; x[2]=5; return *x; }'
assert 4 'int main() { int x[3]; *x=3; x[1]=4; x[2]=5; return *(x+1); }'
assert 5 'int main() { int x[3]; *x=3; x[1]=4; x[2]=5; return *(x+2); }'
assert 5 'int main() { int x[3]; *x=3; x[1]=4; x[2]=5; return *(x+2); }'
assert 5 'int main() { int x[3]; *x=3; x[1]=4; 2[x]=5; return *(x+2); }'

assert 0 'int main() { int x[2][3]; int *y=x; y[0]=0; return x[0][0]; }'
assert 1 'int main() { int x[2][3]; int *y=x; y[1]=1; return x[0][1]; }'
assert 2 'int main() { int x[2][3]; int *y=x; y[2]=2; return x[0][2]; }'
assert 3 'int main() { int x[2][3]; int *y=x; y[3]=3; return x[1][0]; }'
assert 4 'int main() { int x[2][3]; int *y=x; y[4]=4; return x[1][1]; }'
assert 5 'int main() { int x[2][3]; int *y=x; y[5]=5; return x[1][2]; }'
```

‍
