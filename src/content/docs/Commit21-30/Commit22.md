---
title: 22. Int Type and Variables
---

## commit log

```plaintext
Add keyword "int" and make variable definition mandatory
```

之前的commit中，我们声明一个变量，都是直接写变量名。但是我们知道，C语言中有不同种类的变量，譬如`int`，`double`等。所以在上一次commit我们引入类型这一概念后，这一次commit，我们就来正式引入类型。我们要求每次声明变量的时候，都必须标明它们的类型，例如：

```c
int x;
int y=2;
int z1,z2, z3 = 3, z4;
int ** array;
int*** T_d_arrary;
```

## 思路

从上面的例子中，其实就可以回答一个问题，就是我们在上一次commit中，为什么不直接用TypeKInd，而非得用一个Type的指针。这是因为，尽管我们看起来只有两种不同的Type，但是实际上，我们是有无穷多种的，有`int`，`int`指针，`int`指针的指针，`int`指针的指针的指针...仅仅使用TypeKind，没有办法表示如此多的类型。

我们重点要做的，就是对于parser的改造，我们要对stmt的语法分析做扩展，添加一个新的声明变量的语句。

## 头文件

我们把Obj做一个拓展，把类型信息加入到里面：

```c
struct Obj {
  Obj *next;
  char *name;
  Type *ty;   // Type  // <------
  int offset; 
};
```

Type也做一个扩展，允许可以通过它找到变量名。

```c
struct Type {
  TypeKind kind;
  // Pointer
  Type *base;
  // Declaration
  Token *name;    // <-----
};
```

# parser

我们先开始扩展`compound_stmt`，之所以是这个，而并非`stmt`，是因为我们要把一条声明语句，要给它看作是一个Block，因为我们是允许类似于`int x, y=2, z;`这样的语句存在的。

```c
static Node *compound_stmt(Token **rest, Token *tok) {
  Node *node = new_node(ND_BLOCK, tok);

  Node head = {}; 
  Node *cur = &head;
  while (!equal(tok, "}")) {
    if (equal(tok, "int"))    // <------
      cur = cur->next = declaration(&tok, tok);  // <------
    else
      cur = cur->next = stmt(&tok, tok);
    add_type(cur);
  }

  node->body = head.next;
  *rest = tok->next;
  return node;
}
```

如果扫描到一个`int`，那么我们要通过`declaration`来处理，这个函数要生成一个Node链表。

```c
static Node *declaration(Token **rest, Token *tok) {
  // 现阶段，basety只会是ty_int，但是因为我们之后还会拓展类型
  // 因此这里使用了一个函数，根据tok现在的值来确定返回一个什么类型
  Type *basety = declspec(&tok, tok); 
  // 初始化node链表
  Node head = {};
  Node *cur = &head;
  int i = 0;
  // 只要不到最后的分号
  while (!equal(tok, ";")) {
    // 下面的if其实主要是为了跳过第一个变量，因为第一个变量
    // 是不跟在`,`后面的
    if (i++ > 0)
      tok = skip(tok, ",");

    // 我们有一个basety没错，但问题是我们不知道它是int还是int*还是int**
    // 因此利用declarator来确定它的真实类型，然后再把它赋给一个obj
    // 注意这里的new_lvar需要做一点修改，另外我们还用到新的了get_ident函数
    // 用来type所指获取变量名
    Type *ty = declarator(&tok, tok, basety);
    Obj *var = new_lvar(get_ident(ty->name), ty);
    // 如果只是声明变量的话，那么其实是不需要加入node链表的
    // 只需要在语法分析中把变量给记录下来就好了。
    if (!equal(tok, "="))
      continue;
    // 如果有`=`的话，就需要生成一个Node了，具体来说就是assign。
    Node *lhs = new_var_node(var, ty->name);
    Node *rhs = assign(&tok, tok->next);
    Node *node = new_binary(ND_ASSIGN, lhs, rhs, tok);
    cur = cur->next = new_unary(ND_EXPR_STMT, node, tok);
  }

  // 最后生成一个block node
  Node *node = new_node(ND_BLOCK, tok);
  node->body = head.next;
  *rest = tok->next;
  return node;
}

```

然后我们把这个`declspec`，`declarator`和`get_ident`函数给补全：

```c
static char *get_ident(Token *tok) {
  if (tok->kind != TK_IDENT)
    error_tok(tok, "expected an identifier");
  return strndup(tok->loc, tok->len);
}

// declspec = "int"
static Type *declspec(Token **rest, Token *tok) {
  *rest = skip(tok, "int");
  return ty_int;
}

// declarator = "*"* ident
static Type *declarator(Token **rest, Token *tok, Type *ty) {
  while (consume(&tok, tok, "*"))
    ty = pointer_to(ty);

  if (tok->kind != TK_IDENT)
    error_tok(tok, "expected a variable name");

  ty->name = tok;
  *rest = tok->next;
  return ty;
}
```

这里的declarator同时用到了一个consume函数，就是用于处理类似于`int***`这种情况的：

```c
bool consume(Token **rest, Token *tok, char *str) {
  if (equal(tok, str)) {
    *rest = tok->next;
    return true;
  }
  *rest = tok;
  return false;
}
```

另外，我们这里把变量的声明变为强制了，因此需要把`primary`修改一下：

```c
if (tok->kind == TK_IDENT) {
  Obj *var = find_var(tok);
  if (!var)
    error_tok(tok, "undefined variable");
  *rest = tok->next;
  return new_var_node(var, tok);
}
```

这样就完成了，也不需要修改codegen。

## test.sh

把所有的变量都加上int前缀即可。

‍
