---
title: 44. Block Scope
---

## commit log

```plaintext
Handle block scope.
```

我们很早的时候，就添加了block，但是我们只是引入了域的概念，其实还没有真的去实现这个域，我们现在希望实现下面的效果：

```c
int main () { int x = 1; {int x = 2; } return x; }  // get 1
int main () { int x = 1; {int x = 2; return x; } }  // get 2
```

## Paser

主要是对语法分析器进行修改，当进入到一个对每一个block，我们定义一个域，当使用到某一个变量的时候，我们从当前的域开始从内往外找。

先来定义scope，每一个block有一个Scope，每一个Scope又有一个VarScope链表。这样在查找一个变量的时候，先从当前Scope内找，遍历VarScope，如果找不到，再继续到next里面去找。

```c
typedef struct VarScope VarScope;
struct VarScope {
  VarScope *next;
  char *name;
  Obj *var;
};

typedef struct Scope Scope;
struct Scope {
  Scope *next;
  VarScope *vars;
}
```

然后我们来定义一个全局的Scope。

```c
static Scope *scope = &(Scope){};
```

当扫描到block的`{`时候，进入一个新的Scope，当扫描到`}`的时候，离开这个Scope。

```c
static void enter_scope(void) {
  Scope *sc = calloc(1, sizeof(Scope));
  sc->next = scope;
  scope = sc;
}

static void leave_scope(void) {
  scope = scope->next;
}
```

现在我们有域的概念之后，接着要求修改`new_var`这个函数，要让其添加到当掐的域当中：

```c
static Obj* new_var(char* name, Type* ty) {
  Obj* var = calloc(1, sizeof(Obj));
  var->name = name;
  var->ty = ty;
  push_scope(name, var);    // <---
  return var;
}
```

然后我们来实现这个`push_scope`：

```c
static VarScope *push_scope(char *name, Obj *var) {
  VarScope *sc = calloc(1, sizeof(VarScope));
  sc->name = name;
  sc->var = var;
  sc->next = scope->vars;
  scope->vars = sc;
  return sc;
}
```

接着就需要修改`find_var`这个函数：

```c
static Obj *find_var(Token *tok) {
  for(Scope *sc = scope; sc; sc = sc->next) 
    for(VarScope *sc2 = sc->vars; sc2; sc2 = sc2->next) 
      if (equal(tok, sc2->name))
        return sc2->var;
  return NULL;
}
```

最后，我们把`compound_stmt`和`function`修改一下：

```c
static Node *compound_stmt(Token **rest, Token *tok) {
  // code
  enter_scope();

  while(!equal(tok, "}")) {
    ...
  }
  leave_scope();
}

static Token *function(Token *tok, Type *basety) {
  // codes
  enter_scope();
  create_param_lvars(ty->params);
  //codes
  leave_scope();
  return tok;
}
```

## test.sh

```bash
assert 2 'int main() { int x=2; { int x=3; } return x; }'
assert 2 'int main() { int x=2; { int x=3; } { int y=4; return x; }}'
assert 3 'int main() { int x=2; { x=3; } return x; }'
```

‍
